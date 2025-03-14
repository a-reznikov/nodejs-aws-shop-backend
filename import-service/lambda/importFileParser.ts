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

const s3Client = new S3Client({ region: "eu-central-1" });

export const handler = async (event: S3Event) => {
  try {
    console.log("Event importFileParser:", event);
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

      await new Promise<void>((resolve, reject) => {
        const readableStream = Readable.from(file);

        readableStream
          .pipe(csvParser())
          .on("data", console.log)
          .on("error", (error) => reject(error))
          .on("end", async () => {
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

            resolve();
          });
      });
    }

    return {
      statusCode: 200,
      headers,
      body: "File parsing successfully completed",
    };
  } catch (error) {
    return handleUnexpectedError(error, "importFileParser");
  }
};
