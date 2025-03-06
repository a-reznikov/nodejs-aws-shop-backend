import { handler } from "../lambda/getProductsList";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";
import { mockProducts, mockStocks } from "./mock-data";

dotenv.config();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  ScanCommand: jest.fn(),
}));

describe("GET /api/products", () => {
  const mockSend = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    .send as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should return all products", async () => {
    mockSend.mockResolvedValueOnce({ Items: mockProducts });
    mockSend.mockResolvedValueOnce({ Items: mockStocks });

    const response = await handler();

    expect(response.statusCode).toBe(200);

    const expectedResponse = mockProducts.map((product) => ({
      ...product,
      count: mockStocks.find(({ product_id }) => product_id === product.id)
        ?.count,
    }));

    expect(JSON.parse(response.body)).toEqual(expectedResponse);
  });
});
