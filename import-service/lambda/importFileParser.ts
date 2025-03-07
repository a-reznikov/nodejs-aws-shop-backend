import { S3Client } from "@aws-sdk/client-s3";
import { headers } from "./api/constants";
import { handleUnexpectedError } from "./error-handler";

const client = new S3Client({ region: "eu-central-1" });

export const handler = async (event: any) => {
  try {
    console.log("Event importFileParser:", event);
    console.log("Records", event.Records);

    return {
      statusCode: 200,
      headers,
      body: "File parsing has been done",
    };
  } catch (error) {
    return handleUnexpectedError(error, "importFileParser");
  }
};
