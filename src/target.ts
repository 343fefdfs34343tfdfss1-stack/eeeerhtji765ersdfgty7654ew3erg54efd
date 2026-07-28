export function normalizeTarget(value: string) {
  const trimmed = value.trim();
  const mention = trimmed.match(/^<@!?(\d{17,20})>$/);
  if (mention) return mention[1];
  if (/^\d{17,20}$/.test(trimmed)) return trimmed;

  const username = trimmed.replace(/^@/, "");
  if (/^[a-zA-Z0-9._]{2,32}$/.test(username)) return username;
  throw new Error("Enter a valid Discord username, user ID, or mention.");
}
