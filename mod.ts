import type {
  Request,
  Response,
} from "https://raw.githubusercontent.com/use-seedling/seedling/master/mod.ts";

type Handler = (request: Request, response: Response) => void;

export default (host: string, token: string): Handler => {
  return async (request: Request, response: Response) => {
    if (!request.body) {
      return response.error("Missing GraphQL Query");
    }

    const [full, operationName] = request.body.match(/^query (\w+)/i) || [];

    if (!operationName) {
      return response.error("Malformed Query, can't retrieve Operation Name");
    }

    try {
      const result = await fetch(host, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operationName,
          query: request.body,
          variables: request.attrs,
        }),
      });

      if (!result.ok) {
        if (result.status >= 500) {
          return response.retry(
            "Unexpected error, backing off and then trying again",
          );
        } else if (result.status >= 400 && result.status < 500) {
          return response.error("Network issue, request failed");
        }
      }
      const output = await result.json();
      return response.success(output.data);
    } catch (e) {
      return response.error("Something went wrong", e);
    }
  };
};
