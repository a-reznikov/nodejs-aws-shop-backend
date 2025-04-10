import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import {
  Cors,
  LambdaIntegration,
  RestApi,
  RequestAuthorizer,
  AuthorizationType,
} from "aws-cdk-lib/aws-apigateway";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Queue } from "aws-cdk-lib/aws-sqs";

dotenv.config();

export class AlexImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const catalogItemsQueueArn = process.env.CATALOG_ITEM_QUEUE_ARN;
    const authLambdaArn = process.env.AUTH_LAMBDA_ARN;

    if (!(catalogItemsQueueArn && authLambdaArn)) {
      console.log(
        "Environment variables:",
        JSON.stringify({
          isCatalogItemsQueueArn: Boolean(catalogItemsQueueArn),
          isAuthLambdaArn: Boolean(authLambdaArn),
        })
      );

      throw Error(
        "Failed to create AlexImportServiceStack. Environment variables are not defined!"
      );
    }

    const bucket = new s3.Bucket(this, "AlexReznikovImportServiceBucket", {
      bucketName: "alex-reznikov-import-service-bucket",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedHeaders: ["*"],
        },
      ],
    });

    const catalogItemsQueue = Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      catalogItemsQueueArn
    );

    const importProductsFileLambda = new Function(
      this,
      "importProductsHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset("lambda"),
        handler: "importProductsFile.handler",
        environment: {
          IMPORT_SERVICE_BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    const importFileParserLambda = new Function(
      this,
      "importFileParserHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset("lambda"),
        handler: "importFileParser.handler",
        environment: {
          CATALOG_ITEM_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
      }
    );

    const basicAuthorizerLambda = Function.fromFunctionArn(
      this,
      "basicAuthorizerHandler",
      authLambdaArn
    );

    const importProductsPolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"],
      effect: iam.Effect.ALLOW,
      resources: [bucket.bucketArn + "/*"],
    });

    const importFileParserPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      resources: [bucket.bucketArn + "/*"],
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );

    importProductsFileLambda.addToRolePolicy(importProductsPolicy);
    importFileParserLambda.addToRolePolicy(importFileParserPolicy);

    catalogItemsQueue.grantSendMessages(importFileParserLambda);

    const api = new RestApi(this, "AlexImportServiceApi", {
      restApiName: "AlexImportServiceApi",
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const importProductsFileEndpoint = api.root.addResource("import");

    const authorizer = new RequestAuthorizer(this, "BasicAuthorizer", {
      handler: basicAuthorizerLambda,
      identitySources: ["method.request.header.Authorization"],
    });

    importProductsFileEndpoint.addMethod(
      "GET",
      new LambdaIntegration(importProductsFileLambda),
      {
        authorizationType: AuthorizationType.CUSTOM,
        authorizer: authorizer,
      }
    );
  }
}
