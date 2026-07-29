import type { RobloxUser } from "./github.js";

export function makeRobloxUser(usernameInput: string | null, userIdInput: string | null): RobloxUser {
  const username = usernameInput?.trim();
  const userId = userIdInput?.trim();

  if (!username && !userId) {
    throw new Error("Enter username or user ID.");
  }
  if (username && !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Invalid username.");
  }
  if (userId && !/^\d{1,20}$/.test(userId)) {
    throw new Error("Invalid user ID.");
  }

  return {
    ...(userId ? { roblox_user_id: userId } : {}),
    ...(username ? { roblox_username: username } : {})
  };
}
