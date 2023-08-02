"use client";

import { getAccessTokenFromRefreshToken } from "@/lib/oauth/request";
import { useEffect } from "react";

export default function ApiExamples() {
  useEffect(() => {
    (async () => {
      try {
        // Refresh the access token every 30 minutes.
        // You'll want to do something like this if
        // you need to refresh the user's inventory
        // or something like that
        setInterval(async () => {
          await getAccessTokenFromRefreshToken();
        }, 30 * 60 * 1000);
      } catch (e) {
        throw e;
      }
    })();

    return () => {
      // Clean up here if you need to
    };
  }, []);
  const handleRefreshToken = () => {
    console.log("handleRefreshToken");
    getAccessTokenFromRefreshToken();
  };
  return (
    <div>
      <div>Api Examples</div>
      <div>
        <button onClick={handleRefreshToken}>Refresh Token</button>
      </div>
    </div>
  );
}
