"use client";

import { getAccessToken } from "@/lib/oauth/request";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function OauthReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    if (!code) {
      throw new Error("No code found");
    }
    (async () => {
      try {
        await getAccessToken({ code });
        router.push("/");
      } catch (e) {}
    })();

    return () => {
      // Clean up here if you need to
    };
  }, [code, router]);

  return <div>OAuth Return</div>;
}
