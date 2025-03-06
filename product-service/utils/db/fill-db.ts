import * as dotenv from "dotenv";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { getStocksByProducts, products } from "../../db";

dotenv.config();

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const fillDynamoDbTables = async () => {
  try {
    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;

    if (!(productsTableName && stocksTableName)) {
      throw new Error("Tables name are not defined");
    }

    console.log({ productsTableName, stocksTableName });

    const fillProducts = new BatchWriteCommand({
      RequestItems: {
        [productsTableName]: products.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    });

    const productsOutput = await documentClient.send(fillProducts);
    console.log("Products table filled:", productsOutput);

    const fillStocks = new BatchWriteCommand({
      RequestItems: {
        [stocksTableName]: getStocksByProducts(products).map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    });

    const stocksOutput = await documentClient.send(fillStocks);
    console.log("Stocks table filled:", stocksOutput);
  } catch (error) {
    console.error(error);
  }
};

fillDynamoDbTables();
