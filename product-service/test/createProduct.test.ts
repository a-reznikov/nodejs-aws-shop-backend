import { handler } from "../lambda/createProduct";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";

dotenv.config();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  TransactWriteCommand: jest.fn(),
}));

describe("POST /api/products", () => {
  const mockSend = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    .send as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should create a new product successfully", async () => {
    const newProduct = {
      title: "New Book",
      description: "Description of the new book",
      price: 10,
      count: 20,
    };

    mockSend.mockResolvedValueOnce({});

    const event = {
      body: JSON.stringify(newProduct),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(201);

    const responseBody = JSON.parse(response.body);

    expect(responseBody.message).toBe("New product has been created");
    expect(responseBody.product).toEqual(
      expect.objectContaining({
        title: newProduct.title,
        description: newProduct.description,
        price: newProduct.price,
      })
    );
  });

  it("Should return a 400 error if validation fails", async () => {
    const invalidProductData = {
      title: "",
      description: "Description of the new book",
      price: "10",
      count: 20,
    };

    const event = {
      body: JSON.stringify(invalidProductData),
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(
      "Validation Error. Required fields are missing or have invalid types."
    );
  });
});
