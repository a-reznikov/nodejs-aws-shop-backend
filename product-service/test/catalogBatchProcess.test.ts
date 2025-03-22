import { handler } from "../lambda/catalogBatchProcess";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSEvent } from "aws-lambda";
import { SnsItem } from "../lambda/api/types";

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  },
  TransactWriteCommand: jest.fn(),
}));

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockReturnValue({
    send: jest.fn(),
  }),
  PublishCommand: jest.fn(),
}));

describe("catalogBatchProcess", () => {
  const mockDynamoDBSend = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    .send as jest.Mock;
  const mockSnsSend = new SNSClient({}).send as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DYNAMO_DB_PRODUCTS = "MockProductsTable";
    process.env.DYNAMO_DB_STOCKS = "MockStocksTable";
    process.env.CREATE_PRODUCT_TOPIC_ARN = "MockCreateProductTopic";
  });

  it("Should process a single SQS message successfully", async () => {
    const newProduct = {
      title: "Test Product",
      description: "Test Description",
      price: 25,
      count: 50,
    };

    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify(newProduct),
        },
      ],
    } as SQSEvent;

    mockDynamoDBSend.mockResolvedValueOnce({});
    mockSnsSend.mockResolvedValueOnce({});

    const response = await handler(sqsEvent);
    const responseBody = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(responseBody.snsItems).toHaveLength(1);
    expect(responseBody.snsItems[0]).toEqual(
      expect.objectContaining({
        title: newProduct.title,
        description: newProduct.description,
        price: newProduct.price,
        count: newProduct.count,
      })
    );
    expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);
    expect(mockSnsSend).toHaveBeenCalledTimes(1);
  });

  it("Should handle multiple SQS messages successfully", async () => {
    const products = [
      {
        title: "Test Product 1",
        description: "Test Description 1",
        price: 10,
        count: 100,
      },
      {
        title: "Test Product 2",
        description: "Test Description 2",
        price: 20,
        count: 200,
      },
    ];

    const sqsEvent = {
      Records: products.map((product) => ({
        body: JSON.stringify(product),
      })),
    } as SQSEvent;

    mockDynamoDBSend.mockResolvedValueOnce({});
    mockSnsSend.mockResolvedValueOnce({});

    const response = await handler(sqsEvent);
    const responseBody = JSON.parse(response.body);
    const snsItems: SnsItem[] = responseBody.snsItems;

    expect(response.statusCode).toBe(201);
    expect(snsItems).toHaveLength(2);
    snsItems.forEach((item, index) => {
      expect(item).toEqual(
        expect.objectContaining({
          title: products[index].title,
          description: products[index].description,
          price: products[index].price,
          count: products[index].count,
        })
      );
    });
    expect(mockDynamoDBSend).toHaveBeenCalledTimes(1);
    expect(mockSnsSend).toHaveBeenCalledTimes(2);
  });

  it("Should return a 400 error if validation fails", async () => {
    const invalidProductData = {
      title: "",
      description: "Test Description",
      price: "invalid type",
      count: 50,
    };

    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify(invalidProductData),
        },
      ],
    } as SQSEvent;

    const response = await handler(sqsEvent);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(
      "Validation Error. Required fields are missing or have invalid types."
    );
    expect(mockDynamoDBSend).not.toHaveBeenCalled();
    expect(mockSnsSend).not.toHaveBeenCalled();
  });
});
