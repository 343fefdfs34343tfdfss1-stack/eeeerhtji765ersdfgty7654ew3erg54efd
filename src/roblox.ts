export type RobloxProfile = {
  id: string;
  username: string;
  displayName: string;
  profileUrl: string;
};

type RobloxUserResponse = {
  id: number;
  name: string;
  displayName: string;
};

type UsernameLookupResponse = {
  data?: RobloxUserResponse[];
};

async function fetchRoblox(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new Error("Roblox could not be reached. Try again in a moment.");
  } finally {
    clearTimeout(timeout);
  }
  return response;
}

async function getById(userId: string): Promise<RobloxUserResponse> {
  const response = await fetchRoblox(`https://users.roblox.com/v1/users/${userId}`);
  if (response.status === 404) throw new Error("That user ID does not link to a Roblox profile.");
  if (!response.ok) throw new Error("Roblox could not verify that user ID. Try again in a moment.");
  return response.json() as Promise<RobloxUserResponse>;
}

async function getByUsername(username: string): Promise<RobloxUserResponse> {
  const response = await fetchRoblox("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });
  if (!response.ok) throw new Error("Roblox could not verify that username. Try again in a moment.");
  const result = await response.json() as UsernameLookupResponse;
  const user = result.data?.[0];
  if (!user) throw new Error("That username does not link to a Roblox profile.");
  return user;
}

export async function resolveRobloxUser(
  usernameInput: string | null,
  userIdInput: string | null
): Promise<RobloxProfile> {
  const username = usernameInput?.trim() || null;
  const userId = userIdInput?.trim() || null;
  if (!username && !userId) throw new Error("Enter a username, a user ID, or both.");

  let profile: RobloxUserResponse;
  if (userId) {
    profile = await getById(userId);
    if (username && profile.name.toLowerCase() !== username.toLowerCase()) {
      throw new Error("The username and user ID belong to different Roblox profiles.");
    }
  } else {
    profile = await getByUsername(username!);
    profile = await getById(String(profile.id));
  }

  return {
    id: String(profile.id),
    username: profile.name,
    displayName: profile.displayName,
    profileUrl: `https://www.roblox.com/users/${profile.id}/profile`
  };
}
