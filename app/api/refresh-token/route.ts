import { TOKEN_URL } from "@/lib/constants";
import privateEnv from "@/lib/private-env";
import publicEnv from "@/lib/public-env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const refreshToken = url.searchParams.get("refreshToken");
  if (!refreshToken) {
    return NextResponse.json({ error: "No refreshToken" }, { status: 400 });
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: publicEnv.NEXT_PUBLIC_BNET_OAUTH_CLIENT_ID,
    client_secret: privateEnv.BNET_OAUTH_CLIENT_SECRET,
  });

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
