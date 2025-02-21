import { products } from "./products/products";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "*",
  "Content-Type": "application/json",
};

export const handler = async () => {
  try {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(products),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(error.message),
    };
  }
};
