import { convertToError } from "@/lib/utils";
import {
  PlatformErrorCodes,
  ServerResponse,
} from "bungie-api-ts-no-const-enum/app";
import { HttpClient, HttpClientConfig } from "bungie-api-ts-no-const-enum/http";
import { fetchWithBungieOAuth } from "../oauth/authenticated-fetch";

export function createHttpClient(
  fetchFunction: typeof fetch,
  apiKey: string
): HttpClient {
  return async <T>(config: HttpClientConfig) => {
    let url = config.url;
    if (config.params) {
      url = `${url}?${new URLSearchParams(config.params).toString()}`;
    }

    const fetchOptions = new Request(url, {
      method: config.method,
      body: config.body ? JSON.stringify(config.body) : undefined,
      headers: {
        "X-API-Key": apiKey,
        ...(config.body ? { "Content-Type": "application/json" } : undefined),
      },
      credentials: "omit",
    });

    const response = await fetchFunction(fetchOptions);
    let data: T | undefined;
    let parseError: Error | undefined;
    try {
      data = (await response.json()) as T;
    } catch (e) {
      parseError = convertToError(e);
    }

    // try throwing bungie errors, which have more information, first
    throwBungieError(data, fetchOptions);
    // then throw errors on generic http error codes
    await throwHttpError(response);
    if (parseError) {
      throw parseError;
    }
    return data!; // At this point it's not undefined, there would've been a parse error
  };
}

/**
 * this is a non-affecting pass-through for successful http requests,
 * but throws JS errors for a non-200 response
 */
function throwHttpError(response: Response) {
  if (response.status < 200 || response.status >= 400) {
    throw new HttpStatusError(response);
  }
  return response;
}

/**
 * sometimes what you have looks like a Response but it's actually an Error
 *
 * this is a non-affecting pass-through for successful API interactions,
 * but throws JS errors for "successful" fetches with Bungie error information
 */
function throwBungieError<T>(serverResponse: T | undefined, request: Request) {
  if (!serverResponse || typeof serverResponse !== "object") {
    return serverResponse;
  }

  // There's an alternate error response that can be returned during maintenance
  const eMessage =
    "error" in serverResponse &&
    "error_description" in serverResponse &&
    (serverResponse.error_description as string);
  if (eMessage) {
    throw new BungieError(
      {
        Message: eMessage,
        ErrorCode: PlatformErrorCodes.DestinyUnexpectedError,
        ErrorStatus: eMessage,
      },
      request
    );
  }

  if (
    "ErrorCode" in serverResponse &&
    serverResponse.ErrorCode !== PlatformErrorCodes.Success
  ) {
    throw new BungieError(
      serverResponse as Partial<ServerResponse<unknown>>,
      request
    );
  }

  return serverResponse;
}
/**
 * an error indicating the Bungie API sent back a parseable response,
 * and that response indicated the request was not successful
 */
export class BungieError extends Error {
  code?: PlatformErrorCodes;
  status?: string;
  endpoint: string;
  constructor(response: Partial<ServerResponse<unknown>>, request: Request) {
    super(response.Message);
    this.name = "BungieError";
    this.code = response.ErrorCode;
    this.status = response.ErrorStatus;
    this.endpoint = request.url;
  }
}

/**
 * an error indicating a non-200 response code
 */
export class HttpStatusError extends Error {
  status: number;
  constructor(response: Response) {
    super(response.statusText);
    this.status = response.status;
  }
}

export const authenticatedHttpClient = createHttpClient(
  fetchWithBungieOAuth,
  process.env.NEXT_PUBLIC_BNET_API_KEY!
);
export const unauthenticatedHttpClient = createHttpClient(
  fetch,
  process.env.NEXT_PUBLIC_BNET_API_KEY!
);
