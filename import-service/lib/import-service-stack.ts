import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";

export class AlexImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "AlexReznikovImportServiceBucket", {
      bucketName: "alex-reznikov-import-service-bucket",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedHeaders: ["*"],
        },
      ],
    });

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

    const importProductsPolicy = new iam.PolicyStatement({
      actions: ["s3:PutObject"],
      effect: iam.Effect.ALLOW,
      resources: [bucket.bucketArn + "/*"],
    });

    importProductsFileLambda.addToRolePolicy(importProductsPolicy);

    const api = new RestApi(this, "AlexImportServiceApi", {
      restApiName: "AlexImportServiceApi",
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const importProductsFileEndpoint = api.root.addResource("import");

    importProductsFileEndpoint.addMethod(
      "GET",
      new LambdaIntegration(importProductsFileLambda)
    );
  }
}
