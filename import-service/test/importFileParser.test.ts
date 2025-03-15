import { handler } from "../lambda/importFileParser";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import { Readable } from "node:stream";
import * as fs from "fs";
import * as path from "path";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/client-sqs");

describe("handler", () => {
  const MOCK_BUCKET_NAME = "mock-bucket-name";
  const MOCK_FILE_NAME = "file-example.csv";
  let mockS3Client: S3Client;
  let mockSqsClient: SQSClient;
  const mockEvent = {
    Records: [
      {
        s3: {
          bucket: {
            name: MOCK_BUCKET_NAME,
          },
          object: {
            key: `uploaded/${MOCK_FILE_NAME}`,
          },
        },
      },
    ],
  } as S3Event;

  beforeEach(() => {
    mockS3Client = new S3Client({ region: "eu-central-1" });
    mockSqsClient = new SQSClient({ region: "eu-central-1" });
    (S3Client as jest.Mock).mockClear();
    (SQSClient as jest.Mock).mockClear();
    (mockS3Client.send as jest.Mock).mockClear();
    (mockSqsClient.send as jest.Mock).mockClear();
    process.env.CATALOG_ITEM_QUEUE_URL = "mock-sqs-url";
  });

  it("should successfully parse, send to SQS, copy and delete CSV file from S3", async () => {
    const filePath = path.join(__dirname, "mock-data", MOCK_FILE_NAME);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const mockReadableStream = Readable.from(fileContent);

    (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
      Body: mockReadableStream,
    });

    (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});
    (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});
    (mockSqsClient.send as jest.Mock).mockResolvedValue({});

    const result = await handler(mockEvent);

    expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    expect(mockSqsClient.send).toHaveBeenCalledTimes(3);
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.any(GetObjectCommand)
    );
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.any(CopyObjectCommand)
    );
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.any(DeleteObjectCommand)
    );
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(SendMessageCommand)
    );
    expect(result.statusCode).toEqual(200);
  });

  it("should handle error when GetObject returns non-readable stream", async () => {
    (mockS3Client.send as jest.Mock).mockResolvedValueOnce({
      Body: "Not a readable stream",
    });

    const result = await handler(mockEvent);

    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.any(GetObjectCommand)
    );

    expect(result.statusCode).toEqual(500);
    expect(result.body).toContain(
      "Failed to process importFileParser. File is undefined or not readable stream."
    );
  });
});
