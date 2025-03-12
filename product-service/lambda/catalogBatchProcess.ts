import { DynamoDBClient, TransactWriteItem } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { headers } from "./api/constants";
import {
  handleUnexpectedError,
  isValidProductCreateData,
} from "./error-handler";
import { randomUUID } from "crypto";
import { SQSEvent } from "aws-lambda";
import { SNSClient } from "@aws-sdk/client-sns";

const dynamoDBClient = new DynamoDBClient({ region: "eu-central-1" });
const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
const snsClient = new SNSClient({ region: "eu-central-1" });

export const handler = async (event: SQSEvent) => {
  try {
    console.log("Event catalogBatchProcess: ", event);

    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;

    if (!(productsTableName && stocksTableName)) {
      throw Error(
        "Failed to process getProductById. Tables names are not defined!"
      );
    }

    const dynamoDBTransactItems: TransactWriteItem[] = [];

    for (const sqsRecord of event.Records) {
      const incomingProductData = JSON.parse(sqsRecord?.body || "{}");

      if (!isValidProductCreateData(incomingProductData)) {
        return {
          statusCode: 400,
          headers,
          body: "Validation Error. Required fields are missing or have invalid types.",
        };
      }

      const { title, description, price, count } = incomingProductData;

      const id = String(randomUUID());

      const newProduct = {
        id,
        title,
        description,
        price,
      };
      const newStock = { product_id: id, count };

      console.log("New product", newProduct);
      console.log("New stock", newStock);

      const putProduct = {
        Put: {
          TableName: productsTableName,
          Item: marshall(newProduct),
        },
      };

      const putStock = {
        Put: {
          TableName: stocksTableName,
          Item: marshall(newStock),
        },
      };

      dynamoDBTransactItems.push(putProduct, putStock);
    }

    await dynamoDBDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: dynamoDBTransactItems,
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "New product has been created",
      }),
    };
  } catch (error: any) {
    return handleUnexpectedError(error, "createProduct");
  }
};
