# Discord → GitHub tracking bot

This Discord bot provides one administrator-only slash command:

```text
/users
```

All user management starts from the embedded `/users` panel. No separate add or remove slash commands are registered. Add cancellation and successful removal return to the main panel, while removal screens and workflow errors include **Back to Users**.

Run `/users` to open an ephemeral embedded control panel with compact, linked avatar boxes and pagination. **Add User** uses the verified Roblox profile preview with Add/Cancel, and **Remove User** opens the avatar list, dropdown, and Remove/Cancel flow. The panel also supports refreshing and editing the complete JSON document. Full-document editing is limited by Discord to 4,000 characters.

The removal menu uses equal-sized entries and tries the stored user ID first, followed by the username, to resolve the Roblox avatar and hyperlinked username/ID line. Legacy username casing is canonicalized for display, while adding remains strictly case-sensitive.

Adding a user is a two-step process. The bot first verifies the submitted username or user ID against Roblox, then shows the canonical profile and avatar headshot in a clickable embed with exactly **Add** and **Cancel** buttons. Usernames are case-sensitive and must exactly match Roblox's canonical capitalization. It only writes both the canonical username and ID to GitHub after **Add** is pressed. If no exact profile is found, the bot returns an error embed instead.

## Configuration

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in the Discord bot token, application ID, testing server ID, and a fine-grained GitHub token.
4. Limit the GitHub token to this repository with **Contents: read/write** permission.
5. Optionally set `ALLOWED_ROLE_IDS` to a comma-separated list of Discord role IDs. If it is empty, only server administrators can run `/users`.

For the current project:

```dotenv
DISCORD_CLIENT_ID=1531735414182772756
DISCORD_GUILD_ID=1531754313947549848
GITHUB_OWNER=343fefdfs34343tfdfss1-stack
GITHUB_REPO=eeeerhtji765ersdfgty7654ew3erg54efd
GITHUB_BRANCH=main
TRACKING_FILE=DC BOT TEST
```

Do not commit `.env` or either token.

## Run locally

```powershell
npm install
npm run register
npm run dev
```

Guild commands normally appear immediately. Re-run `npm run register` after changing the command definition.

## Production

```powershell
npm run build
npm start
```
