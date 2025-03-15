import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { headers } from "./api/constants";
import {
  handleUnexpectedError,
  isValidProductCreateData,
} from "./error-handler";
import { randomUUID } from "crypto";
import { SQSEvent } from "aws-lambda";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SnsItem } from "./api/types";

const dynamoDBClient = new DynamoDBClient({ region: "eu-central-1" });
const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
const snsClient = new SNSClient({ region: "eu-central-1" });

export const handler = async (event: SQSEvent) => {
  try {
    console.log("Event catalogBatchProcess: ", event);

    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;
    const createProductTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN;

    if (!(productsTableName && stocksTableName && createProductTopicArn)) {
      console.log(
        "Environment variables:",
        JSON.stringify({
          isProductsTableName: Boolean(productsTableName),
          isStocksTableName: Boolean(stocksTableName),
          isCreateProductTopicArn: Boolean(createProductTopicArn),
        })
      );

      throw Error(
        "Failed to process catalogBatchProcess. Environment variables are not defined!"
      );
    }

    const dynamoDBTransactItems = [];
    const snsItems: SnsItem[] = [];

    for (const sqsRecord of event.Records) {
      const incomingProductData = JSON.parse(sqsRecord?.body || "{}");
      console.log(
        "IncomingProductData:",
        JSON.stringify({
          incomingProductData,
        })
      );

      if (!isValidProductCreateData(incomingProductData)) {
        return {
          statusCode: 400,
          headers,
          body: "Validation Error. Required fields are missing or have invalid types.",
        };
      }

      const { title, description, price, count } = incomingProductData;

      const id = randomUUID();

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
          Item: newProduct,
        },
      };

      const putStock = {
        Put: {
          TableName: stocksTableName,
          Item: newStock,
        },
      };

      dynamoDBTransactItems.push(putProduct, putStock);

      const snsItem = {
        ...newProduct,
        count: newStock.count,
      };

      snsItems.push(snsItem);
    }

    await dynamoDBDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: dynamoDBTransactItems,
      })
    );

    const snsPublishMessages = snsItems.map((snsItem) => {
      const messageBody = JSON.stringify({
        message: `New product has been added: ${snsItem.title}`,
        product: snsItem,
      });

      console.log("Publishing message to SNS:", messageBody);

      return snsClient.send(
        new PublishCommand({
          Subject: "Product Notification",
          TopicArn: createProductTopicArn,
          Message: messageBody,
        })
      );
    });

    const snsPublishOutputs = await Promise.all(snsPublishMessages);

    console.log("snsPublishOutputs", snsPublishOutputs);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        snsItems,
      }),
    };
  } catch (error: any) {
    return handleUnexpectedError(error, "catalogBatchProcess");
  }
};
