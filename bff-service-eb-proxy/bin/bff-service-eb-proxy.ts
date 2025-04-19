#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AReznikovBffServiceEbProxyStack } from "../lib/bff-service-eb-proxy-stack";

const app = new cdk.App();
new AReznikovBffServiceEbProxyStack(app, "AReznikovBffServiceEbProxyStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
