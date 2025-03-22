import { Product } from "../../db";

export type SnsItem = Product & {
  count: number;
};
