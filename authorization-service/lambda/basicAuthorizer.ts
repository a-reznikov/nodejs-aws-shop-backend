import { handleUnexpectedError } from "./error-handler";

export const handler = async (event: any) => {
  try {
    console.log("Event basicAuthorizer:", event);

    const correctPassword = process.env["a-reznikov"];

    if (!correctPassword) {
      throw Error(
        "Failed to process basicAuthorizer. Environment variables are not defined!"
      );
    }

    console.log("correctPassword", correctPassword);

    return null;
  } catch (error) {
    return handleUnexpectedError(error, "basicAuthorizer");
  }
};
