import { handler } from "../lambda/importProductsFile";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handleUnexpectedError } from "../lambda/error-handler";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

describe("importProductsFile Lambda", () => {
  const event = {
    queryStringParameters: {
      name: "mock-file-name.csv",
    },
  };
  const MOCK_BUCKET_NAME = "mock-bucket-name";

  const mockSignedUrl = "https://mock-signed-url.com/uploaded";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 when no file name is provided", async () => {
    const eventWithoutName = { queryStringParameters: {} };

    const result = await handler(eventWithoutName);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: "File name is missing" })
    );
  });

  it("should return 500 if importServiceBucketName is not defined", async () => {
    const importServiceBucketName = process.env.IMPORT_SERVICE_BUCKET_NAME;

    const result = await handler(event);

    expect(importServiceBucketName).toBeUndefined();
    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(
      handleUnexpectedError(
        new Error(
          "Failed to process importProductsFile. importServiceBucketName is not defined!"
        )
      ).body
    );
  });

  it("should return a signed URL", async () => {
    process.env.IMPORT_SERVICE_BUCKET_NAME = MOCK_BUCKET_NAME;

    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(mockSignedUrl);
  });

  it("should handle decoding the file name properly", async () => {
    const eventWithEncodedFileName = {
      queryStringParameters: {
        name: "mock%20file%20name.csv",
      },
    };

    process.env.IMPORT_SERVICE_BUCKET_NAME = MOCK_BUCKET_NAME;
    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

    const result = await handler(eventWithEncodedFileName);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(mockSignedUrl);
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: MOCK_BUCKET_NAME,
      Key: "uploaded/mock file name.csv",
      ContentType: "text/csv",
    });
  });
});
