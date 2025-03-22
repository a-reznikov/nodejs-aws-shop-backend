import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";

dotenv.config();

export class AlexAuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubAccountLogin = process.env["a-reznikov"];

    if (!githubAccountLogin) {
      throw Error(
        "Failed to create AlexAuthorizationServiceStack. Environment variables are not defined!"
      );
    }

    new Function(this, "basicAuthorizerHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "basicAuthorizer.handler",
      environment: {
        "a-reznikov": githubAccountLogin,
      },
    });
  }
}
