import { PlatformErrorCodes } from "bungie-api-ts-no-const-enum/app";
import { getAccessToken } from "./request";
import { Tokens, getToken, removeAccessToken, removeToken } from "./tokens";

/**
 * A fatal token error means we have to log in again.
 */
export class FatalTokenError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "FatalTokenError";
  }
}

/**
 * A wrapper around "fetch" that implements Bungie's OAuth scheme. This either
 * includes a cached token, refreshes a token then includes the refreshed token,
 * or bounces us back to login.
 */
export async function fetchWithBungieOAuth(
  request: URL | RequestInfo,
  options?: RequestInit,
  triedRefresh = false
): Promise<Response> {
  if (!(request instanceof Request)) {
    request = new Request(request);
  }

  try {
    const token = await getActiveToken();
    request.headers.set("Authorization", `Bearer ${token.accessToken.value}`);
  } catch (e: any) {
    if (e instanceof FatalTokenError) {
      console.warn(
        `Unable to get auth token, clearing auth tokens. Go to /login if you get this error. ${e}`
      );

      removeToken();
      // TODO: This is a bit of a janky way to redirect to login
      // history.pushState({}, "", "/login");
      // window.location.reload();
    }
    throw e;
  }

  // clone is us trying to work around "Body has already been consumed." in retry.
  const response = await fetch(request.clone(), options);
  if (await responseIndicatesBadToken(response)) {
    if (triedRefresh) {
      // Give up
      removeToken();
      throw new FatalTokenError(
        "Access token expired, and we've already tried to refresh. Failing."
      );
    }
    // OK, Bungie has told us our access token is expired or
    // invalid. Refresh it and try again.
    console.log("Access token expired, removing access token and trying again");
    removeAccessToken();
    return fetchWithBungieOAuth(request, options, true);
  }

  return response;
}

async function responseIndicatesBadToken(response: Response) {
  if (response.status === 401) {
    return true;
  }
  try {
    const data = await response.clone().json();
    return Boolean(
      data &&
        (data.ErrorCode === PlatformErrorCodes.AccessTokenHasExpired ||
          data.ErrorCode === PlatformErrorCodes.WebAuthRequired ||
          // (also means the access token has expired)
          data.ErrorCode === PlatformErrorCodes.WebAuthModuleAsyncFailed ||
          data.ErrorCode === PlatformErrorCodes.AuthorizationRecordRevoked ||
          data.ErrorCode === PlatformErrorCodes.AuthorizationRecordExpired ||
          data.ErrorCode === PlatformErrorCodes.AuthorizationCodeStale ||
          data.ErrorCode === PlatformErrorCodes.AuthorizationCodeInvalid)
    );
  } catch {}
  return false;
}

export async function getActiveToken(): Promise<Tokens> {
  try {
    await getAccessToken();
    return getToken() as Tokens;
  } catch (e) {
    throw new Error(`Unable to get active token: ${e}`);
  }
}
