import { Product } from "../products/types";
import { Stock } from "./types";

const generateRandomCount = () => Math.floor(Math.random() * 50) + 1;

export const getStocksByProducts = (products: Product[]): Stock[] => {
  return products.map(({ id }) => {
    return {
      product_id: id,
      count: generateRandomCount(),
    };
  });
};
