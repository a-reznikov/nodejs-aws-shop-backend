import { ProductCreateData } from "../../db";

export const isValidProductCreateData = (
  productCreateData: any
): productCreateData is ProductCreateData =>
  typeof productCreateData?.title === "string" &&
  typeof productCreateData?.description === "string" &&
  typeof productCreateData?.price === "number" &&
  typeof productCreateData?.count === "number";
