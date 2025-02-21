import * as cdk from "aws-cdk-lib";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class AlexProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new Function(this, "GetProductsListHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductsList.handler",
    });

    const getProductById = new Function(this, "GetProductByIdHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductsById.handler",
    });

    const api = new RestApi(this, "AlexProductServiceApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const productsEndpoint = api.root.addResource("products");
    const productByIdEndpoint = productsEndpoint.addResource("{id}");

    productsEndpoint.addMethod("GET", new LambdaIntegration(getProductsList));
    productByIdEndpoint.addMethod("GET", new LambdaIntegration(getProductById));
  }
}
