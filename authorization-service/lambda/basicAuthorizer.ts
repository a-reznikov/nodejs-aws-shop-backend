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
    const passwordByUserName = process.env?.[username];

    console.log("passwordByUserName", passwordByUserName);

    if (!passwordByUserName) {
      console.log("passwordByUserName was not found");

      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Forbidden: passwordByUserName not found",
        }),
      };
    }

    if (password === passwordByUserName) {
      const authorizerResponse = {
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

      console.log("authorizerResponse", JSON.stringify(authorizerResponse));

      return authorizerResponse;
    } else {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden: incorrect password" }),
      };
    }
  } catch (error) {
    return handleUnexpectedError(error, "basicAuthorizer");
  }
};
