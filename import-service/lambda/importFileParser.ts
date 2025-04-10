import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { headers } from "./api/constants";
import { handleUnexpectedError } from "./error-handler";
import { S3Event } from "aws-lambda";
import * as csvParser from "csv-parser";
import { Readable } from "node:stream";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { ProductCreateData } from "./api/types";

const s3Client = new S3Client({ region: "eu-central-1" });
const sqsClient = new SQSClient({ region: "eu-central-1" });

export const handler = async (event: S3Event) => {
  try {
    console.log("Event importFileParser:", event);

    const catalogItemsQueueUrl = process.env.CATALOG_ITEM_QUEUE_URL;

    if (!catalogItemsQueueUrl) {
      throw Error(
        "Failed to process importFileParser. Environment variables are not defined!"
      );
    }

    const records = event.Records;

    for (const record of records) {
      console.log("Record", JSON.stringify(record));

      const bucketName = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log({ bucketName, key });

      const objectCommandParams = { Bucket: bucketName, Key: key };

      const getObjectResponse = await s3Client.send(
        new GetObjectCommand(objectCommandParams)
      );

      console.log("getObjectResponse", getObjectResponse);

      const { Body: file } = getObjectResponse;

      if (!(file && file instanceof Readable)) {
        throw Error(
          "Failed to process importFileParser. File is undefined or not readable stream."
        );
      }

      const parsedProducts: ProductCreateData[] = [];

      await new Promise<void>((resolve, reject) => {
        const readableStream = Readable.from(file);

        readableStream
          .pipe(csvParser())
          .on("data", (row) => {
            parsedProducts.push({
              ...row,
              price: Number(row?.price),
              count: Number(row?.count),
            });
          })
          .on("error", (error) => reject(error))
          .on("end", resolve);
      });

      const sqsSendMessages = parsedProducts.map((row) => {
        const message = JSON.stringify(row);
        console.log("Sending row to SQS:", message);

        const command = {
          QueueUrl: catalogItemsQueueUrl,
          MessageBody: message,
        };

        console.log("SendMessage command", JSON.stringify(command));

        return sqsClient.send(new SendMessageCommand(command));
      });

      const sqsSendOutputs = await Promise.allSettled(sqsSendMessages);

      sqsSendOutputs.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Failed to send SQS message for row ${index}:`,
            result.reason
          );
        } else {
          console.log(`Successfully sent SQS message for row ${index}`);
        }
      });

      const copyObjectCommandParams = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${key}`,
        Key: key.replace("uploaded", "parsed"),
      };

      const copyObjectCommandOutput = await s3Client.send(
        new CopyObjectCommand(copyObjectCommandParams)
      );
      console.log(
        "File has been copied to parsed: CopyObjectCommandOutput",
        copyObjectCommandOutput
      );

      const deleteObjectCommandOutput = await s3Client.send(
        new DeleteObjectCommand(objectCommandParams)
      );
      console.log(
        "File has been deleted from uploaded: DeleteObjectCommandOutput",
        deleteObjectCommandOutput
      );
    }

    console.log("The importFileParser lambda was successfully executed.");

    return {
      statusCode: 200,
      headers,
      body: "File parsing successfully completed",
    };
  } catch (error) {
    return handleUnexpectedError(error, "importFileParser");
  }
};
