import { Octokit } from "@octokit/rest";
import { config } from "./config.js";

const github = new Octokit({ auth: config.GITHUB_TOKEN, request: { timeout: 8000 } });
const repository = { owner: config.GITHUB_OWNER, repo: config.GITHUB_REPO };

export type RobloxUser = {
  roblox_user_id?: string;
  roblox_username?: string;
};

export type RobloxUserList = {
  roblox_users: RobloxUser[];
};

export type RobloxUserSnapshot = {
  list: RobloxUserList;
  sha: string;
};

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error &&
    (error as { status?: number }).status === 409;
}

function decodeFile(content: string) {
  return Buffer.from(content.replaceAll("\n", ""), "base64").toString("utf8");
}

function sameList(left: RobloxUserList, right: RobloxUserList) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateUser(user: unknown, index: number): RobloxUser {
  if (typeof user !== "object" || user === null || Array.isArray(user)) {
    throw new Error(`Invalid entry ${index + 1}.`);
  }

  const item = user as Record<string, unknown>;
  const username = item.roblox_username;
  const userId = item.roblox_user_id;
  if (username === undefined && userId === undefined) {
    throw new Error(`Entry ${index + 1} needs a username or ID.`);
  }
  if (username !== undefined && (typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username))) {
    throw new Error(`Invalid username in entry ${index + 1}.`);
  }
  if (userId !== undefined && (typeof userId !== "string" || !/^\d{1,20}$/.test(userId))) {
    throw new Error(`Invalid ID in entry ${index + 1}.`);
  }
  if (Object.keys(item).some((key) => key !== "roblox_username" && key !== "roblox_user_id")) {
    throw new Error(`Invalid field in entry ${index + 1}.`);
  }

  return {
    ...(userId ? { roblox_user_id: userId } : {}),
    ...(username ? { roblox_username: username } : {})
  };
}

export function validateUserList(value: unknown): RobloxUserList {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid JSON.");
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.roblox_users)) {
    throw new Error("Missing roblox_users list.");
  }
  if (Object.keys(record).some((key) => key !== "roblox_users")) {
    throw new Error("Invalid JSON field.");
  }

  return { roblox_users: record.roblox_users.map(validateUser) };
}

function parseUserList(content: string) {
  try {
    return validateUserList(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Invalid user list.");
    throw error;
  }
}

async function readFile(): Promise<RobloxUserSnapshot> {
  const { data } = await github.repos.getContent({
    ...repository,
    path: config.TRACKING_FILE,
    ref: config.GITHUB_BRANCH
  });
  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error("User list unavailable.");
  }
  return { list: parseUserList(decodeFile(data.content)), sha: data.sha };
}

export async function getRobloxUsers(): Promise<RobloxUserList> {
  return (await readFile()).list;
}

export function getRobloxUsersSnapshot(): Promise<RobloxUserSnapshot> {
  return readFile();
}

async function updateUserList(
  change: (list: RobloxUserList) => RobloxUserList,
  message: string,
  expectedSha?: string
): Promise<RobloxUserList> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { list, sha } = await readFile();
    if (expectedSha && sha !== expectedSha) {
      throw new Error("JSON changed. Reopen Edit JSON.");
    }
    const updatedList = validateUserList(change(structuredClone(list)));
    if (sameList(list, updatedList)) return updatedList;
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
          name: "Roblox Users",
          email: "roblox-users@users.noreply.local"
        }
      });
      return updatedList;
    } catch (error) {
      try {
        const latest = await readFile();
        if (sameList(latest.list, updatedList)) return latest.list;
      } catch {
        // Keep the original update result.
      }
      if (isConflict(error) && expectedSha) {
        throw new Error("JSON changed. Reopen Edit JSON.");
      }
      if (isConflict(error) && attempt < 2) continue;
      if (isConflict(error)) throw new Error("Update conflict. Try again.");
      throw new Error("Update failed. Try again.");
    }
  }
  throw new Error("Update conflict. Try again.");
}

export async function addRobloxUser(user: RobloxUser) {
  let added = false;
  const list = await updateUserList(
    (list) => {
      const exists = list.roblox_users.some((entry) =>
        (user.roblox_user_id && entry.roblox_user_id === user.roblox_user_id) ||
        (user.roblox_username && entry.roblox_username?.toLowerCase() === user.roblox_username.toLowerCase())
      );
      added = !exists;
      return exists ? list : { roblox_users: [...list.roblox_users, user] };
    },
    `Add Roblox user ${user.roblox_username ?? user.roblox_user_id}`
  );
  return { list, added };
}

export function removeExactRobloxUser(user: RobloxUser) {
  return updateUserList((list) => {
    const index = list.roblox_users.findIndex((entry) =>
      entry.roblox_user_id === user.roblox_user_id &&
      entry.roblox_username === user.roblox_username
    );
    if (index === -1) throw new Error("User not in list.");
    list.roblox_users.splice(index, 1);
    return list;
  }, `Remove Roblox user ${user.roblox_username ?? user.roblox_user_id}`);
}

export function replaceRobloxUsers(list: RobloxUserList, expectedSha: string) {
  return updateUserList(() => list, "Edit complete Roblox user JSON list", expectedSha);
}
