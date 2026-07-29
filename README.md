# Discord → GitHub tracking bot

This Discord bot provides one administrator-only slash command:

```text
/add user username:<optional Roblox username> user_id:<optional Roblox user ID>
```

At least one of `username` or `user_id` must be supplied. The bot displays `Adding User`, appends the user object to the `roblox_users` JSON array in the configured GitHub file, and then displays `User Added`.

Run `/users` to open an ephemeral embedded control panel using the same compact, linked avatar boxes and pagination as `/remove user`. Its buttons support adding, editing, and removing numbered entries, refreshing the display, and editing the complete JSON document in a Discord form. Full-document editing is limited by Discord to 4,000 characters.

Run `/remove user` to open a compact, paginated removal list. Each equal-sized entry uses the stored user ID first and then the username to resolve the Roblox avatar and a hyperlinked username/ID line. Legacy username casing is canonicalized for display, while `/add user` remains strictly case-sensitive. Choose a user from the dropdown, then press **Remove** or **Cancel**.

Adding a user is a two-step process. The bot first verifies the submitted username or user ID against Roblox, then shows the canonical profile and avatar headshot in a clickable embed with exactly **Add** and **Cancel** buttons. Usernames are case-sensitive and must exactly match Roblox's canonical capitalization. It only writes both the canonical username and ID to GitHub after **Add** is pressed. If no exact profile is found, the bot returns an error embed instead.

## Configuration

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Fill in the Discord bot token, application ID, testing server ID, and a fine-grained GitHub token.
4. Limit the GitHub token to this repository with **Contents: read/write** permission.
5. Optionally set `ALLOWED_ROLE_IDS` to a comma-separated list of Discord role IDs. If it is empty, only server administrators can run `/track`.

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
