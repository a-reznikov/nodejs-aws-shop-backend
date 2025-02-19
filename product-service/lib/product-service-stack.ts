import * as cdk from "aws-cdk-lib";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class AlexProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new Function(this, "GetProductsListHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductList.handler",
    });
  }
}
