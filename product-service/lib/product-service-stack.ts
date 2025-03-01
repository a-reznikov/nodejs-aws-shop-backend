import * as cdk from "aws-cdk-lib";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Code, Runtime, Function } from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

dotenv.config();

export class AlexProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;

    if (!(productsTableName && stocksTableName)) {
      throw Error(
        "Failed to create AlexProductServiceStack. Tables names are not defined!"
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

    const getProductsList = new Function(this, "GetProductsListHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductsList.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);

    const getProductById = new Function(this, "GetProductByIdHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "getProductById.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProductById);

    const createProduct = new Function(this, "CreateProductHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"),
      handler: "createProduct.handler",
      environment: {
        DYNAMO_DB_PRODUCTS: productsTableName,
        DYNAMO_DB_STOCKS: stocksTableName,
      },
    });

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
