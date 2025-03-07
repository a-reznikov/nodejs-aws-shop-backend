import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { headers } from "./api/constants";
import { handleUnexpectedError } from "./error-handler";

const client = new S3Client({ region: "eu-central-1" });

export const handler = async (event: any) => {
  try {
    console.log("Event importProductsFile:", event);

    const fileName = event?.queryStringParameters?.name;

    if (!fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "File name is missing" }),
      };
    }

    const importServiceBucketName = process.env.IMPORT_SERVICE_BUCKET_NAME;

    if (!importServiceBucketName) {
      throw Error(
        "Failed to process importProductsFile. importServiceBucketName is not defined!"
      );
    }

    const command = new PutObjectCommand({
      Bucket: importServiceBucketName,
      Key: `uploaded/${fileName}`,
      ContentType: "text/csv",
    });

    const signedUrl = await getSignedUrl(client, command);

    return {
      statusCode: 200,
      headers,
      body: signedUrl,
    };
  } catch (error) {
    return handleUnexpectedError(error, "importProductsFile");
  }
};
