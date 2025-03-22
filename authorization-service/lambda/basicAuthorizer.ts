import { handleUnexpectedError } from "./error-handler";

export const handler = async (event: any) => {
  try {
    console.log("Event basicAuthorizer:", event);

    const authHeader = event.headers?.authorization;

    if (!(authHeader && authHeader.startsWith("Basic "))) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    console.log("authHeader", authHeader);

    const encodedCredentials = authHeader.split(" ")[1];

    console.log("encodedCredentials", encodedCredentials);

    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64"
    ).toString("utf-8");

    console.log("decodedCredentials", decodedCredentials);

    const [username, password] = decodedCredentials.split(":");

    const correctPassword = process.env.a_reznikov;

    if (!correctPassword) {
      throw Error(
        "Failed to process basicAuthorizer. Environment variables are not defined!"
      );
    }

    console.log("correctPassword", correctPassword);

    if (password === correctPassword) {
      return {
        principalId: username,
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: "execute-api:Invoke",
              Effect: "Allow",
              Resource: event.methodArn,
            },
          ],
        },
      };
    } else {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden" }),
      };
    }
  } catch (error) {
    return handleUnexpectedError(error, "basicAuthorizer");
  }
};
