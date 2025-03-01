import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { headers } from "./api/constants";
import { handleUnexpectedError } from "./error-handler";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    console.log("Event getProductById: ", event);

    const { id } = event.pathParameters;

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify("Product ID is required."),
      };
    }

    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;

    if (!(productsTableName && stocksTableName)) {
      throw Error(
        "Failed to process getProductById. Tables names are not defined!"
      );
    }

    const { Item: product } = await documentClient.send(
      new GetCommand({
        TableName: productsTableName,
        Key: {
          id,
        },
      })
    );

    console.log("Founded product: ", product);

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify(`Product with id ${id} was not found`),
      };
    }

    const { Item: stock } = await documentClient.send(
      new GetCommand({
        TableName: stocksTableName,
        Key: {
          product_id: id,
        },
      })
    );

    console.log("Founded stock: ", stock);

    if (!stock) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify(`Stock was not found for product with id ${id}`),
      };
    }

    const productData = {
      ...product,
      count: stock.count,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(productData),
    };
  } catch (error: any) {
    return handleUnexpectedError(error, "getProductById");
  }
};
