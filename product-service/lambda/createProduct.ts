import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { headers, DEFAULT_IMAGE } from "./api/constants";
import {
  handleUnexpectedError,
  isValidProductCreateData,
} from "./error-handler";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    console.log("Event createProduct: ", event);

    const body = JSON.parse(event?.body || "{}");
    const { title, description, price, count } = body;
    const image =
      body?.image && typeof body?.image === "string"
        ? body?.image
        : DEFAULT_IMAGE;

    if (!isValidProductCreateData({ title, description, price, count })) {
      console.log(
        "Validation Error. Required fields are missing or have invalid types."
      );

      return {
        statusCode: 400,
        headers,
        body: "Validation Error. Required fields are missing or have invalid types.",
      };
    }

    const id = randomUUID();

    const newProduct = { id, title, description, price, image };
    const newStock = { product_id: id, count };

    console.log("New product", newProduct);
    console.log("New stock", newStock);

    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: process.env.DYNAMO_DB_PRODUCTS,
              Item: newProduct,
            },
          },
          {
            Put: {
              TableName: process.env.DYNAMO_DB_STOCKS,
              Item: newStock,
            },
          },
        ],
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: "New product has been created",
        product: newProduct,
      }),
    };
  } catch (error: any) {
    return handleUnexpectedError(error, "createProduct");
  }
};
