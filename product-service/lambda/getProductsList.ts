import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { headers } from "./api/constants";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  try {
    const { Items: products } = await documentClient.send(
      new ScanCommand({ TableName: process.env.DYNAMO_DB_PRODUCTS })
    );
    const { Items: stocks } = await documentClient.send(
      new ScanCommand({ TableName: process.env.DYNAMO_DB_STOCKS })
    );

    const combinedData = products?.map((product) => ({
      ...product,
      count: stocks?.find(({ product_id }) => product_id === product.id)?.count,
    }));

    console.log(
      "getProductsList was successfully completed. Result",
      combinedData
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(combinedData),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(error.message),
    };
  }
};
