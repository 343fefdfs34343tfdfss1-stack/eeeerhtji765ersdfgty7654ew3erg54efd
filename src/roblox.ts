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

const PROFILE_CACHE_MS = 10 * 60 * 1000;
const profileCache = new Map<string, { expires: number; value: Promise<RobloxProfile> }>();

function cachedProfile(key: string, load: () => Promise<RobloxProfile>) {
  const cached = profileCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value: Promise<RobloxProfile>;
  value = load().catch((error) => {
    if (profileCache.get(key)?.value === value) profileCache.delete(key);
    throw error;
  });
  profileCache.set(key, { expires: Date.now() + PROFILE_CACHE_MS, value });
  return value;
}

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
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Image unavailable.");
}

function getProfileById(userId: string) {
  return cachedProfile(`id:${userId}`, async () => {
    const [profile, imageUrl] = await Promise.all([
      getById(userId),
      getAvatarHeadshot(userId)
    ]);
    const id = String(profile.id);
    return {
      id,
      username: profile.name,
      displayName: profile.displayName,
      profileUrl: `https://www.roblox.com/users/${id}/profile`,
      imageUrl
    };
  });
}

function getProfileByUsername(username: string, excludeBannedUsers = true) {
  return cachedProfile(`name:${excludeBannedUsers}:${username}`, async () => {
    const matched = await getByUsername(username, excludeBannedUsers);
    return getProfileById(String(matched.id));
  });
}

export async function resolveRobloxUser(
  usernameInput: string | null,
  userIdInput: string | null
): Promise<RobloxProfile> {
  const username = usernameInput?.trim() || null;
  const userId = userIdInput?.trim() || null;
  if (!username && !userId) throw new Error("Enter username or user ID.");

  const profile = userId
    ? await getProfileById(userId)
    : await getProfileByUsername(username!);

  if (username && profile.username !== username) {
    if (profile.username.toLowerCase() === username.toLowerCase()) {
      throw new Error(`Use exact username: ${profile.username}`);
    }
    throw new Error("Username and ID do not match.");
  }

  return profile;
}

export async function previewStoredRobloxUser(
  username: string | undefined,
  userId: string | undefined
): Promise<StoredRobloxProfile> {
  if (userId) {
    try {
      const profile = await getProfileById(userId);
      return { ...profile, verified: true };
    } catch {
      // Try the stored username independently below.
    }
  }
  if (username) {
    try {
      const profile = await getProfileByUsername(username, false);
      return { ...profile, verified: true };
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
