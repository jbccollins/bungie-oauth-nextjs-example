"use client";

import { getAccessToken } from "@/lib/oauth/request";
import { getToken, hasTokenExpired, removeToken } from "@/lib/oauth/tokens";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ApiExamples() {
  const [tokenResetCount, setTokenResetCount] = useState(0);
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        // Refresh the access token every 30 minutes.
        setInterval(async () => {
          try {
            await getAccessToken();
          } catch (e) {
            throw new Error(`Unable to refresh tokens: ${e}`);
          }
        }, 30 * 60 * 1000);
      } catch (e) {
        throw e;
      }
    })();

    return () => {
      // Clean up here if you need to
    };
  }, []);
  const handleForceResetTokens = async () => {
    const refreshToken = getToken()?.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }
    if (hasTokenExpired(refreshToken)) {
      throw new Error("Refresh token has expired");
    }
    try {
      await getAccessToken({ refreshToken: refreshToken.value });
      setTokenResetCount(tokenResetCount + 1);
    } catch (e) {
      throw new Error(`Unable to refresh tokens: ${e}`);
    }
  };

  const handleClearTokens = () => {
    removeToken();
    router.push("/login");
  };

  const tokens = getToken();

  return (
    <div>
      <div>OAuth Playground</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          rowGap: "8px",
          maxWidth: "200px",
          margin: "auto",
          marginTop: "16px",
        }}
      >
        {tokens && (
          <button onClick={handleForceResetTokens}>Force Reset Tokens</button>
        )}
        <button onClick={handleClearTokens}>
          {tokens ? "Clear Tokens (Logout)" : "Go To Login"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          rowGap: "8px",
          maxWidth: "calc(100vw - 32px)",
          margin: "auto",
          wordBreak: "break-all",
          marginTop: "24px",
        }}
      >
        {tokens && (
          <>
            <div>Access Token:</div>
            <div>{tokens.accessToken.value}</div>
            <div>Refresh Token:</div>
            <div>{tokens.refreshToken?.value}</div>
          </>
        )}
        {!tokens && <div>No tokens found.</div>}
      </div>
    </div>
  );
}
