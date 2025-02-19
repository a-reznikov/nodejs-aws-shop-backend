import { products } from "./products";

export const handler = async () => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(products),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(error.message),
    };
  }
};
