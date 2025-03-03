import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { headers } from "./api/constants";
import { handleUnexpectedError } from "./error-handler";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  try {
    const productsTableName = process.env.DYNAMO_DB_PRODUCTS;
    const stocksTableName = process.env.DYNAMO_DB_STOCKS;

    if (!(productsTableName && stocksTableName)) {
      throw Error(
        "Failed to process getProductById. Tables names are not defined!"
      );
    }

    const { Items: products } = await documentClient.send(
      new ScanCommand({ TableName: productsTableName })
    );
    const { Items: stocks } = await documentClient.send(
      new ScanCommand({ TableName: stocksTableName })
    );

    const productData = products?.map((product) => ({
      ...product,
      count: stocks?.find(({ product_id }) => product_id === product.id)?.count,
    }));

    console.log(
      "getProductsList was successfully completed. Result",
      productData
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(productData),
    };
  } catch (error: any) {
    return handleUnexpectedError(error, "getProductsList");
  }
};
