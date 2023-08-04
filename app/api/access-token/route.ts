import { TOKEN_URL } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

// This endpoint accepts either a code or a refreshToken query parameter.
// If a code is provided, it will be exchanged for an access token and a
// refresh token. If a refreshToken is provided, it will be exchanged for
// a new access token and refresh token.

// We put all this inside of an api route to avoid exposing the client secret.
// We could do this in the browser, but then we'd have to expose the client
// secret in the browser, which is a no-no.

// So this route is basically just a proxy to the Bungie API that adds the client
// secret to the request.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const refreshToken = url.searchParams.get("refreshToken");

  // Both code and refreshToken at the same time is not allowed
  if (code && refreshToken) {
    return NextResponse.json(
      { error: "Cannot use both code and refreshToken" },
      { status: 400 }
    );
  }

  // Ensure that either code or refreshToken is provided
  if (!refreshToken && !code) {
    return NextResponse.json(
      { error: "Must provide either code or refreshToken" },
      { status: 400 }
    );
  }

  // Generate the body of the request
  const body = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_BNET_OAUTH_CLIENT_ID!,
    client_secret: process.env.BNET_OAUTH_CLIENT_SECRET!,
  });

  // Add either code or refreshToken to the body
  if (code) {
    body.append("grant_type", "authorization_code");
    body.append("code", code);
  } else if (refreshToken) {
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", refreshToken);
  }

  // Send the request to Bungie
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const res = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: "Bungie Error", bungieError: res },
      { status: 400 }
    );
  }
  return NextResponse.json(res);
}
