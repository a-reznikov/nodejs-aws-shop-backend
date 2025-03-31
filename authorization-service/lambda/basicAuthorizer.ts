export const handler = async (event: any) => {
  console.log("Event basicAuthorizer:", event);

  const authHeader = event.headers?.Authorization;

  console.log("authHeader", authHeader);

  const encodedCredentials = authHeader?.split("Basic ")?.[1];

  console.log("encodedCredentials", encodedCredentials);

  if (!(encodedCredentials && encodedCredentials !== "null")) {
    throw new Error("Unauthorized");
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf-8"
  );

  console.log("decodedCredentials", decodedCredentials);

  const [username, password] = decodedCredentials.split(":");
  const passwordByUserName = process.env?.[username];

  console.log("passwordByUserName", passwordByUserName);

  const isAuthorized =
    password && passwordByUserName && password === passwordByUserName;

  const authorizerResponse = {
    principalId: username,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: isAuthorized ? "Allow" : "Deny",
          Resource: event.methodArn,
        },
      ],
    },
  };

  console.log("authorizerResponse", JSON.stringify(authorizerResponse));

  return authorizerResponse;
};
