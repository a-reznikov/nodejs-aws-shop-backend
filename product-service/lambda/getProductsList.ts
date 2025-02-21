import { headers } from "./api/constants";
import { products } from "./products/products";

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
