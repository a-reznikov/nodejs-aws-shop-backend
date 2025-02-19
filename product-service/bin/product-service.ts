#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AlexProductServiceStack } from "../lib/product-service-stack";

const app = new cdk.App();
new AlexProductServiceStack(app, "AlexProductServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
