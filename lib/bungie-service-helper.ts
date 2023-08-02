//import { showNotification } from 'app/notifications/notifications';
import { PlatformErrorCodes } from "bungie-api-ts-no-const-enum/destiny2";
import { HttpClient, HttpClientConfig } from "bungie-api-ts-no-const-enum/http";
import throttle from "lodash.throttle";
import { fetchWithBungieOAuth } from "./oauth/authenticated-fetch";
import {
  BungieError,
  HttpStatusError,
  createFetchWithNonStoppingTimeout,
  createHttpClient,
  responsivelyThrottleHttpClient,
  sentryTraceHttpClient,
} from "./oauth/http-client";
import { rateLimitedFetch } from "./oauth/rate-limiter";
import publicEnv from "./public-env";

const apiKey = publicEnv.NEXT_PUBLIC_BNET_API_KEY;

const TIMEOUT = 15000;
const notifyTimeout = throttle(
  (startTime: number, timeout: number) => {
    // Only notify if the timeout fired around the right time - this guards against someone pausing
    // the tab and coming back in an hour, for example
    if (
      navigator.onLine &&
      Math.abs(Date.now() - (startTime + timeout)) <= 1000
    ) {
      console.warn("BungieService.Slow");
      // showNotification({
      // 	type: 'warning',
      // 	title: 'BungieService.Slow',
      // 	body: 'BungieService.SlowDetails',
      // 	duration: 15000
      // });
    }
  },
  5 * 60 * 1000, // 5 minutes
  { leading: true, trailing: false }
);

const logThrottle = (timesThrottled: number, waitTime: number, url: string) =>
  console.log(
    "bungie api",
    "Throttled",
    timesThrottled,
    "times, waiting",
    waitTime,
    "ms before calling",
    url
  );

// it would be really great if they implemented the pipeline operator soon
/** used for most Bungie API requests */
export const authenticatedHttpClient = errorHandledHttpClient(
  responsivelyThrottleHttpClient(
    sentryTraceHttpClient(
      createHttpClient(
        createFetchWithNonStoppingTimeout(
          rateLimitedFetch(fetchWithBungieOAuth),
          TIMEOUT,
          notifyTimeout
        ),
        apiKey,
        // TODO: figure out what the cookie does
        false // $featureFlags.apiCookies
      )
    ),
    logThrottle
  )
);

/** used to get manifest and global alerts */
export const unauthenticatedHttpClient = errorHandledHttpClient(
  responsivelyThrottleHttpClient(
    sentryTraceHttpClient(
      createHttpClient(
        createFetchWithNonStoppingTimeout(fetch, TIMEOUT, notifyTimeout),
        apiKey,
        false
      )
    ),
    logThrottle
  )
);

/**
 * wrap HttpClient in handling, using i18n strings, bounce to login, etc
 */
export function errorHandledHttpClient(httpClient: HttpClient): HttpClient {
  return async (config: HttpClientConfig) => {
    try {
      return await httpClient(config);
    } catch (e) {
      handleErrors(e as Error);
    }
  };
}

/**
 * if HttpClient throws an error (js, Bungie, http) this enriches it with DIM concepts and then re-throws it
 */
export function handleErrors(error: Error) {
  if (typeof DOMException !== "undefined") {
    // Called from client
    if (error instanceof DOMException && error.name === "AbortError") {
      throw navigator.onLine
        ? new Error("BungieService.SlowResponse")
        : new Error("BungieService.NotConnected");
    }
  } else {
    // Called from server
    if (error.name === "AbortError") {
      throw navigator.onLine
        ? new Error("BungieService.SlowResponse")
        : new Error("BungieService.NotConnected");
    }
  }

  if (error instanceof SyntaxError) {
    console.error("bungie api", "Error parsing Bungie.net response", error);
    throw new Error("BungieService.Difficulties");
  }

  if (error instanceof TypeError) {
    throw navigator.onLine
      ? new Error("BungieService.NotConnectedOrBlocked")
      : new Error("BungieService.NotConnected");
  }

  if (error instanceof HttpStatusError) {
    // "I don't think they exist" --Westley, The Princess Bride (1987)
    if (error.status === -1) {
      throw navigator.onLine
        ? new Error("BungieService.NotConnectedOrBlocked")
        : new Error("BungieService.NotConnected");
    }

    // Token expired and other auth maladies
    if (error.status === 401 || error.status === 403) {
      throw new Error("BungieService.NotLoggedIn");
    }

    // 526 = cloudflare
    // We don't catch 500s because the Bungie.net API started returning 500 for legitimate game conditions
    if (error.status >= 502 && error.status <= 526) {
      throw new Error("BungieService.Difficulties");
    }

    // if no specific other http error
    throw new Error("BungieService.NetworkError");
  }

  // See https://github.com/DestinyDevs/BungieNetPlatform/wiki/Enums#platformerrorcodes
  if (error instanceof BungieError) {
    switch (error.code ?? -1) {
      case PlatformErrorCodes.DestinyVendorNotFound:
        throw new Error("BungieService.VendorNotFound");

      case PlatformErrorCodes.AuthorizationCodeInvalid:
      case PlatformErrorCodes.AccessNotPermittedByApplicationScope:
        throw new Error("BungieService.AppNotPermitted");

      case PlatformErrorCodes.SystemDisabled:
        alert(
          "The Bungie API is down for maintainence. This app will not work until the Bungie API is back up. Check @BungieHelp on twitter for status updates."
        );
        throw new Error("BungieService.Maintenance");

      case PlatformErrorCodes.ThrottleLimitExceededMinutes:
      case PlatformErrorCodes.ThrottleLimitExceededMomentarily:
      case PlatformErrorCodes.ThrottleLimitExceededSeconds:
      case PlatformErrorCodes.DestinyThrottledByGameServer:
      case PlatformErrorCodes.PerApplicationThrottleExceeded:
      case PlatformErrorCodes.PerApplicationAnonymousThrottleExceeded:
      case PlatformErrorCodes.PerApplicationAuthenticatedThrottleExceeded:
      case PlatformErrorCodes.PerUserThrottleExceeded:
        throw new Error("BungieService.Throttled");

      case PlatformErrorCodes.AccessTokenHasExpired:
      case PlatformErrorCodes.WebAuthRequired:
      case PlatformErrorCodes.WebAuthModuleAsyncFailed: // means the access token has expired
        throw new Error("BungieService.NotLoggedIn");

      case PlatformErrorCodes.DestinyAccountNotFound:
        if (
          error.endpoint.includes("/Account/") &&
          !error.endpoint.includes("/Character/")
        ) {
          throw new Error("BungieService.NoAccount");
        } else {
          throw new Error("BungieService.Difficulties");
        }

      case PlatformErrorCodes.DestinyLegacyPlatformInaccessible:
        throw new Error("BungieService.DestinyLegacyPlatform");

      // These just need a custom error message because people ask questions all the time
      case PlatformErrorCodes.DestinyCannotPerformActionAtThisLocation:
        throw new Error(
          "BungieService.DestinyCannotPerformActionAtThisLocation"
        );
      case PlatformErrorCodes.DestinyItemUnequippable:
        throw new Error("BungieService.DestinyItemUnequippable");

      case PlatformErrorCodes.ApiInvalidOrExpiredKey:
      case PlatformErrorCodes.ApiKeyMissingFromRequest:
      case PlatformErrorCodes.OriginHeaderDoesNotMatchKey:
        throw new Error("BungieService.Difficulties");

      case PlatformErrorCodes.DestinyUnexpectedError:
        throw new Error("BungieService.Difficulties");
      default: {
        throw new Error("BungieService.UnknownError");
      }
    }
  }

  // Any other error
  console.error("bungie api", "No response data:", error);
  throw new Error("BungieService.Difficulties");
}
