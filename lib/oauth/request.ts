import { getToken, setToken, Token, Tokens } from "./tokens";

export const getAccessTokenFromRefreshToken = async (
  _refreshToken?: Token | undefined
): Promise<void> => {
  const refreshToken = _refreshToken ? _refreshToken : getToken()?.refreshToken;
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const queryParams = new URLSearchParams({
    refreshToken: refreshToken.value,
  });
  const response = await fetch(`/api/refresh-token?${queryParams.toString()}`);
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  handleAccessToken(data);
};

export const getAccessToken = async (code: string): Promise<void> => {
  const response = await fetch(`/api/access-token?code=${code}`);
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

    // TODO: Figure out the right place to set tokens and how to redirect to login
    setToken(tokens);
    return tokens;
  } else {
    throw new Error(
      "No data or access token in response: " + JSON.stringify(response)
    );
  }
}
