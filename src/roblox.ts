export type RobloxProfile = {
  id: string;
  username: string;
  displayName: string;
  profileUrl: string;
  imageUrl: string;
};

export type StoredRobloxProfile = {
  id: string;
  username: string;
  profileUrl?: string;
  imageUrl?: string;
  verified: boolean;
};

type RobloxUserResponse = {
  id: number;
  name: string;
  displayName: string;
};

type UsernameLookupResponse = {
  data?: RobloxUserResponse[];
};

type ThumbnailLookupResponse = {
  data?: Array<{
    state?: string;
    imageUrl?: string;
  }>;
};

async function fetchRoblox(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new Error("Try again.");
  } finally {
    clearTimeout(timeout);
  }
  return response;
}

async function getById(userId: string): Promise<RobloxUserResponse> {
  const response = await fetchRoblox(`https://users.roblox.com/v1/users/${userId}`);
  if (response.status === 404) throw new Error("User not found.");
  if (!response.ok) throw new Error("Try again.");
  return response.json() as Promise<RobloxUserResponse>;
}

async function getByUsername(username: string, excludeBannedUsers = true): Promise<RobloxUserResponse> {
  const response = await fetchRoblox("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers })
  });
  if (!response.ok) throw new Error("Try again.");
  const result = await response.json() as UsernameLookupResponse;
  const user = result.data?.[0];
  if (!user) throw new Error("User not found.");
  return user;
}

async function getAvatarHeadshot(userId: string): Promise<string> {
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchRoblox(url);
    if (!response.ok) throw new Error("Image unavailable.");
    const result = await response.json() as ThumbnailLookupResponse;
    const thumbnail = result.data?.[0];
    if (thumbnail?.imageUrl) return thumbnail.imageUrl;
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Image unavailable.");
}

export async function resolveRobloxUser(
  usernameInput: string | null,
  userIdInput: string | null
): Promise<RobloxProfile> {
  const username = usernameInput?.trim() || null;
  const userId = userIdInput?.trim() || null;
  if (!username && !userId) throw new Error("Enter username or user ID.");

  let profile: RobloxUserResponse;
  if (userId) {
    profile = await getById(userId);
  } else {
    profile = await getByUsername(username!);
    profile = await getById(String(profile.id));
  }

  if (username && profile.name !== username) {
    if (profile.name.toLowerCase() === username.toLowerCase()) {
      throw new Error(`Use exact username: ${profile.name}`);
    }
    throw new Error("Username and ID do not match.");
  }

  const id = String(profile.id);

  return {
    id,
    username: profile.name,
    displayName: profile.displayName,
    profileUrl: `https://www.roblox.com/users/${id}/profile`,
    imageUrl: await getAvatarHeadshot(id)
  };
}

export async function previewStoredRobloxUser(
  username: string | undefined,
  userId: string | undefined
): Promise<StoredRobloxProfile> {
  if (userId) {
    try {
      const profile = await resolveRobloxUser(null, userId);
      return { ...profile, verified: true };
    } catch {
      // Try the stored username independently below.
    }
  }
  if (username) {
    try {
      const matched = await getByUsername(username, false);
      const profile = await getById(String(matched.id));
      const id = String(profile.id);
      return {
        id,
        username: profile.name,
        profileUrl: `https://www.roblox.com/users/${id}/profile`,
        imageUrl: await getAvatarHeadshot(id),
        verified: true
      };
    } catch {
      // Keep the invalid legacy entry visible so it can still be removed.
    }
  }
  return {
    id: userId ?? "Unknown",
    username: username ?? "Unknown",
    verified: false
  };
}
