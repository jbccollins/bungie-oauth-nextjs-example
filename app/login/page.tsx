import publicEnv from "@/lib/public-env";
import Link from "next/link";

export default function Login() {
  const queryParams = new URLSearchParams({
    client_id: publicEnv.NEXT_PUBLIC_BNET_OAUTH_CLIENT_ID,
    response_type: "code",
  });
  return (
    <div>
      <Link href={`https://www.bungie.net/en/OAuth/Authorize?${queryParams}`}>
        Authenticate
      </Link>
    </div>
  );
}
