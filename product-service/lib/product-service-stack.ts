import * as cdk from "aws-cdk-lib";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import { FilterOrPolicy, SubscriptionFilter, Topic } from "aws-cdk-lib/aws-sns";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

dotenv.config();

export class AlexProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;
    const mainEmail = process.env.MAIN_EMAIL;
    const secondaryEmail = process.env.SECONDARY_EMAIL;

    if (
      !(productsTableName && stocksTableName && mainEmail && secondaryEmail)
    ) {
      throw Error(
        "Failed to create AlexProductServiceStack. Environment variables are not defined!"
      );
    }

    const productsTable = Table.fromTableName(
      this,
      "ProductsTable",
      productsTableName
    );
    const stocksTable = Table.fromTableName(
      this,
      "StocksTable",
      stocksTableName
    );

    const createProductTopic = new Topic(this, "createProductTopic", {
      topicName: "createProductTopic",
    });
    const catalogItemsQueue = new Queue(this, "catalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    const getProductsList = new Function(this, "GetProductsListHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductsList.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

    const getProductById = new Function(this, "GetProductByIdHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductById.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

    const createProduct = new Function(this, "CreateProductHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "createProduct.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

    const catalogBatchProcess = new Function(
      this,
      "CatalogBatchProcessHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset("lambda"),
        handler: "catalogBatchProcess.handler",
        environment: {
          DYNAMO_DB_PRODUCTS: productsTableName,
          DYNAMO_DB_STOCKS: stocksTableName,
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
      }
    );

    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    createProductTopic.addSubscription(
      new EmailSubscription(mainEmail, {
        filterPolicyWithMessageBody: {
          price: FilterOrPolicy.filter(
            SubscriptionFilter.numericFilter({ greaterThanOrEqualTo: 30 })
          ),
        },
      })
    );

    createProductTopic.addSubscription(
      new EmailSubscription(secondaryEmail, {
        filterPolicyWithMessageBody: {
          price: FilterOrPolicy.filter(
            SubscriptionFilter.numericFilter({ lessThan: 30 })
          ),
        },
      })
    );

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);
    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);
    productsTable.grantReadWriteData(createProduct);
    stocksTable.grantReadWriteData(createProduct);

    const api = new RestApi(this, "AlexProductServiceApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const productsEndpoint = api.root.addResource("products");
    const productByIdEndpoint = productsEndpoint.addResource("{id}");

    productsEndpoint.addMethod("GET", new LambdaIntegration(getProductsList));
    productsEndpoint.addMethod("POST", new LambdaIntegration(createProduct));
    productByIdEndpoint.addMethod("GET", new LambdaIntegration(getProductById));
  }
}
