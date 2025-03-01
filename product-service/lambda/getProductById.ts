import { headers } from "./api/constants";
import { products } from "../db/products/products";

export const handler = async (event: any) => {
  try {
    const { id } = event.pathParameters;
    const product = products.find((product) => product.id === id);

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify(`Product with id ${id} was not found`),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(error.message),
    };
  }
};
