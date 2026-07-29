import { Octokit } from "@octokit/rest";
import { config } from "./config.js";

const github = new Octokit({ auth: config.GITHUB_TOKEN });
const repository = { owner: config.GITHUB_OWNER, repo: config.GITHUB_REPO };

export type RobloxUser = {
  roblox_user_id?: string;
  roblox_username?: string;
};

export type RobloxUserList = {
  roblox_users: RobloxUser[];
};

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error &&
    (error as { status?: number }).status === 409;
}

function decodeFile(content: string) {
  return Buffer.from(content.replaceAll("\n", ""), "base64").toString("utf8");
}

function validateUser(user: unknown, index: number): RobloxUser {
  if (typeof user !== "object" || user === null || Array.isArray(user)) {
    throw new Error(`Entry ${index + 1} must be a JSON object.`);
  }

  const item = user as Record<string, unknown>;
  const username = item.roblox_username;
  const userId = item.roblox_user_id;
  if (username === undefined && userId === undefined) {
    throw new Error(`Entry ${index + 1} needs a username, a user ID, or both.`);
  }
  if (username !== undefined && (typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username))) {
    throw new Error(`Entry ${index + 1} has an invalid Roblox username.`);
  }
  if (userId !== undefined && (typeof userId !== "string" || !/^\d{1,20}$/.test(userId))) {
    throw new Error(`Entry ${index + 1} has an invalid Roblox user ID.`);
  }
  if (Object.keys(item).some((key) => key !== "roblox_username" && key !== "roblox_user_id")) {
    throw new Error(`Entry ${index + 1} contains an unsupported field.`);
  }

  return {
    ...(userId ? { roblox_user_id: userId } : {}),
    ...(username ? { roblox_username: username } : {})
  };
}

export function validateUserList(value: unknown): RobloxUserList {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The JSON must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.roblox_users)) {
    throw new Error("The JSON must contain a roblox_users array.");
  }
  if (Object.keys(record).some((key) => key !== "roblox_users")) {
    throw new Error("The root JSON object contains an unsupported field.");
  }

  return { roblox_users: record.roblox_users.map(validateUser) };
}

function parseUserList(content: string) {
  try {
    return validateUserList(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("The user-list file contains invalid JSON.");
    throw error;
  }
}

async function readFile() {
  const { data } = await github.repos.getContent({
    ...repository,
    path: config.TRACKING_FILE,
    ref: config.GITHUB_BRANCH
  });
  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error(`User-list path '${config.TRACKING_FILE}' is not a text file.`);
  }
  return { list: parseUserList(decodeFile(data.content)), sha: data.sha };
}

export async function getRobloxUsers(): Promise<RobloxUserList> {
  return (await readFile()).list;
}

async function updateUserList(
  change: (list: RobloxUserList) => RobloxUserList,
  message: string
): Promise<RobloxUserList> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { list, sha } = await readFile();
    const updatedList = validateUserList(change(structuredClone(list)));
    const updated = `${JSON.stringify(updatedList, null, 2)}\n`;

    try {
      await github.repos.createOrUpdateFileContents({
        ...repository,
        path: config.TRACKING_FILE,
        branch: config.GITHUB_BRANCH,
        sha,
        message,
        content: Buffer.from(updated, "utf8").toString("base64"),
        committer: {
          name: "Discord GitHub Bot",
          email: "discord-github-bot@users.noreply.github.com"
        }
      });
      return updatedList;
    } catch (error) {
      if (!isConflict(error) || attempt === 2) throw error;
    }
  }
  throw new Error("GitHub update conflicted too many times.");
}

export function addRobloxUser(user: RobloxUser) {
  return updateUserList(
    (list) => ({ roblox_users: [...list.roblox_users, user] }),
    `Add Roblox user ${user.roblox_username ?? user.roblox_user_id}`
  );
}

export function editRobloxUser(index: number, user: RobloxUser) {
  return updateUserList((list) => {
    if (!list.roblox_users[index]) throw new Error("That entry number does not exist.");
    list.roblox_users[index] = user;
    return list;
  }, `Edit Roblox user entry ${index + 1}`);
}

export function removeRobloxUser(index: number) {
  return updateUserList((list) => {
    if (!list.roblox_users[index]) throw new Error("That entry number does not exist.");
    list.roblox_users.splice(index, 1);
    return list;
  }, `Remove Roblox user entry ${index + 1}`);
}

export function replaceRobloxUsers(list: RobloxUserList) {
  return updateUserList(() => list, "Edit complete Roblox user JSON list");
}
