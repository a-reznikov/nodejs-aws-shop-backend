import { products } from "../lambda/products/products";
import { handler } from "../lambda/getProductById";

describe("GET /api/products/:id", () => {
  it("Should return existing product", async () => {
    if (products.length) {
      const { id, title, description, price } = products[0];
      const event = { pathParameters: { id } };
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toStrictEqual({
        description,
        id,
        price,
        title,
      });
    }
  });

  it("Should return response with status 404 if product has been not found", async () => {
    const id = "unknown-id";
    const event = { pathParameters: { id } };
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toBe(
      `Product with id ${id} was not found`
    );
  });
});
