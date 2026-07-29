import { Octokit } from "@octokit/rest";
import { config } from "./config.js";

const github = new Octokit({ auth: config.GITHUB_TOKEN });
const repository = { owner: config.GITHUB_OWNER, repo: config.GITHUB_REPO };

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error &&
    (error as { status?: number }).status === 409;
}

export type RobloxUser = {
  roblox_user_id?: string;
  roblox_username?: string;
};

type RobloxUserList = {
  roblox_users: RobloxUser[];
};

function decodeFile(content: string) {
  return Buffer.from(content.replaceAll("\n", ""), "base64").toString("utf8");
}

function readUserList(content: string): RobloxUserList {
  const parsed: unknown = JSON.parse(content);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("roblox_users" in parsed) ||
    !Array.isArray(parsed.roblox_users)
  ) {
    throw new Error("The GitHub file is not a valid Roblox user list.");
  }

  return { roblox_users: parsed.roblox_users as RobloxUser[] };
}

export async function addRobloxUser(user: RobloxUser): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data } = await github.repos.getContent({
      ...repository,
      path: config.TRACKING_FILE,
      ref: config.GITHUB_BRANCH
    });

    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      throw new Error(`User-list path '${config.TRACKING_FILE}' is not a text file.`);
    }

    const list = readUserList(decodeFile(data.content));
    list.roblox_users.push(user);
    const updated = `${JSON.stringify(list, null, 2)}\n`;

    try {
      await github.repos.createOrUpdateFileContents({
        ...repository,
        path: config.TRACKING_FILE,
        branch: config.GITHUB_BRANCH,
        sha: data.sha,
        message: `Add Roblox user ${user.roblox_username ?? user.roblox_user_id}`,
        content: Buffer.from(updated, "utf8").toString("base64"),
        committer: {
          name: "Discord GitHub Bot",
          email: "discord-github-bot@users.noreply.github.com"
        }
      });

      return;
    } catch (error) {
      if (!isConflict(error) || attempt === 2) throw error;
    }
  }

  throw new Error("GitHub update conflicted too many times.");
}
