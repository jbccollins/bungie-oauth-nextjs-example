import { XOR } from "@/lib/utils";
import { getToken, hasTokenExpired, setToken, Token, Tokens } from "./tokens";

// Get the access token from our internal API route using either a code or a refresh token.
// Note that code and refreshToken are mutually exclusive.
type GetAccessTokenParams = XOR<{ code: string }, { refreshToken: string }>;

export const getAccessToken = async (
  params?: GetAccessTokenParams
): Promise<void> => {
  let val: string | null = null;
  let key: string | null = null;
  // If no params are provided, we'll try to get the access
  // token using the token information from localstorage.
  if (!params) {
    const { accessToken, refreshToken } = getToken() || {};

    // If we have an access token and it hasn't expired, we're done.
    if (accessToken && !hasTokenExpired(accessToken)) {
      console.log("localStorage access token is valid");
      return;
    }

    // If we have a refresh token and it hasn't expired, we'll use that.
    if (!refreshToken) {
      throw new Error("No refresh token found in local storage");
    }
    if (hasTokenExpired(refreshToken)) {
      throw new Error("Refresh token has expired");
    }
    console.log("localStorage refresh token is valid");
    key = "refreshToken";
    val = refreshToken.value;
  } else {
    // If params are provided, we'll use those to forcibly refresh the access token.
    if (!params.code && !params.refreshToken) {
      throw new Error("No code or refresh token");
    }
    key = params.code ? "code" : "refreshToken";
    val = (params.code || params.refreshToken) as string;
  }

  const queryParams = new URLSearchParams({
    [key]: val,
  });

  console.log(`getting access token with params: ${queryParams}`);
  const response = await fetch(`/api/access-token?${queryParams}`);
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  handleAccessToken(data);
};

function handleAccessToken(
  response:
    | {
        access_token: string;
        expires_in: number;
        membership_id: string;
        refresh_token?: string;
        refresh_expires_in: number;
      }
    | undefined
): Tokens {
  if (response?.access_token) {
    const data = response;
    const inception = Date.now();
    const accessToken: Token = {
      value: data.access_token,
      expires: data.expires_in,
      name: "access",
      inception,
    };

    const tokens: Tokens = {
      accessToken,
      bungieMembershipId: data.membership_id,
    };

    if (data.refresh_token) {
      tokens.refreshToken = {
        value: data.refresh_token,
        expires: data.refresh_expires_in,
        name: "refresh",
        inception,
      };
    }

    setToken(tokens);
    return tokens;
  } else {
    throw new Error(
      "No data or access token in response: " + JSON.stringify(response)
    );
  }
}
