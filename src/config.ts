import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_OWNER: z.string().min(1),
  GITHUB_REPO: z.string().min(1),
  GITHUB_BRANCH: z.string().min(1).default("main"),
  TRACKING_FILE: z.string().min(1).default("DC BOT TEST"),
  ALLOWED_ROLE_IDS: z.string().optional().default("")
});

const env = schema.parse(process.env);

export const config = {
  ...env,
  allowedRoleIds: new Set(
    env.ALLOWED_ROLE_IDS.split(",").map((id) => id.trim()).filter(Boolean)
  )
};
