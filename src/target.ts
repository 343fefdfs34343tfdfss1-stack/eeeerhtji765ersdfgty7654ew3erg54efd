import type { RobloxUser } from "./github.js";

export function makeRobloxUser(usernameInput: string | null, userIdInput: string | null): RobloxUser {
  const username = usernameInput?.trim();
  const userId = userIdInput?.trim();

  if (!username && !userId) {
    throw new Error("Enter a username, a user ID, or both.");
  }
  if (username && !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new Error("Enter a valid Roblox username.");
  }
  if (userId && !/^\d{1,20}$/.test(userId)) {
    throw new Error("Enter a valid numeric Roblox user ID.");
  }

  return {
    ...(userId ? { roblox_user_id: userId } : {}),
    ...(username ? { roblox_username: username } : {})
  };
}
