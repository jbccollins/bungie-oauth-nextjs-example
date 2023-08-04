"use client";
import { getAccessToken } from "@/lib/oauth/request";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();
  const [needsAuthentication, setNeedsAuthentication] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        console.log("checking for access token...");
        await getAccessToken();
        router.push("/");
      } catch (e) {
        setNeedsAuthentication(true);
      }
    })();
  }, [router]);

  const queryParams = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_BNET_OAUTH_CLIENT_ID as string,
    response_type: "code",
  });
  return (
    <div>
      {!needsAuthentication && <div>Checking Authentication...</div>}
      {needsAuthentication && (
        <Link href={`https://www.bungie.net/en/OAuth/Authorize?${queryParams}`}>
          Authenticate
        </Link>
      )}
    </div>
  );
}
