import { z } from "zod";
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_BNET_API_KEY: z.string(),
  NEXT_PUBLIC_BNET_OAUTH_CLIENT_ID: z.string(),
  NODE_ENV: z.string(),
});

const publicEnv = PublicEnvSchema.parse(process.env);

export default publicEnv;

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

export const isDevelopment = publicEnv.NODE_ENV === "development";
