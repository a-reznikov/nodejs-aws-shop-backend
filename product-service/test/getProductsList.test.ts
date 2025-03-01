import { products } from "../db/products/products";
import { handler } from "../lambda/getProductsList";

describe("GET /api/products", () => {
  it("Should return all products", async () => {
    const response = await handler();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(expect.arrayContaining(products));
  });
});
