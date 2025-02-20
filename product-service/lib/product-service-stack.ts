import * as cdk from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
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

    const api = new RestApi(this, "AlexProductServiceApi");

    const productsEndpoint = api.root.addResource("products");

    productsEndpoint.addMethod("GET", new LambdaIntegration(getProductsList));
  }
}
