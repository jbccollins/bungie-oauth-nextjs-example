import { z } from "zod";
const PrivateEnvSchema = z.object({
  BNET_OAUTH_CLIENT_SECRET: z.string(),
});

const privateEnv = PrivateEnvSchema.parse(process.env);

export default privateEnv;

export type PublicEnv = z.infer<typeof PrivateEnvSchema>;
