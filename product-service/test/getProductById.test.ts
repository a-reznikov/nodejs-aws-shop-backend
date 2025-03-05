import { handler } from "../lambda/getProductById";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { mockProducts, mockStocks } from "./mock-data";
import * as dotenv from "dotenv";

dotenv.config();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  GetCommand: jest.fn(),
}));

describe("GET /api/products/:id", () => {
  const mockSend = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    .send as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should return existing product", async () => {
    const mockProduct = mockProducts[0];
    const mockStock = mockStocks.find(
      (stock) => stock.product_id === mockProduct.id
    );
    mockSend.mockResolvedValueOnce({ Item: mockProduct });
    mockSend.mockResolvedValueOnce({ Item: mockStock });

    const event = { pathParameters: { id: mockProduct.id } };
    const response = await handler(event);

    const expectedProduct = {
      ...mockProduct,
      count: mockStock?.count,
    };

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toStrictEqual(expectedProduct);
  });

  it("Should return 404 if product is not found", async () => {
    mockSend.mockResolvedValueOnce({ Item: null });
    const productId = "unknown-id";

    const event = { pathParameters: { id: productId } };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toContain(
      `Product with id ${productId} was not found`
    );
  });

  it("Should return 404 if stock is not found", async () => {
    const mockProduct = mockProducts[0];

    mockSend.mockResolvedValueOnce({ Item: mockProduct });
    mockSend.mockResolvedValueOnce({ Item: null });

    const event = { pathParameters: { id: mockProduct.id } };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toContain(
      `Stock was not found for product with id ${mockProduct.id}`
    );
  });
});
