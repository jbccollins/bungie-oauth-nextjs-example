"use client";

import Examples from "@/components/Examples";
import { getAccessToken } from "@/lib/oauth/request";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  // On page load, check if we have a valid access token.
  // If we don't, redirect to the login page.
  useEffect(() => {
    (async () => {
      try {
        console.log("checking for access token...");
        await getAccessToken();
        setIsAuthenticated(true);
      } catch (e) {
        console.warn("Unable to get access token. Going to login.", e);
        router.push("/login");
      }
    })();
  }, [router]);
  return (
    <main>
      {isAuthenticated && <Examples />}
      {!isAuthenticated && <div>Checking Authentication...</div>}
    </main>
  );
}
