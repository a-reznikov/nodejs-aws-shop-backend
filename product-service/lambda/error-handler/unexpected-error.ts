import { headers } from "../api/constants";

export const handleUnexpectedError = (error: any, source?: string) => {
  console.error(`Unexpected error (${source ?? "unknown source"}):`, error);

  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: error?.message || "Internal server error occurred.",
      message: "An unexpected error occurred while processing request.",
    }),
  };
};
