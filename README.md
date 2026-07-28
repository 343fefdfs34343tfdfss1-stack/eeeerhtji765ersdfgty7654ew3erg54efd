# Discord → GitHub tracking bot

This Discord bot provides one administrator-only slash command:

```text
/track target:<Discord username, user ID, or mention>
```

It immediately displays `🔎 Locating...`, then appends the normalized target as a new line in the configured GitHub text file. Duplicate entries are ignored.

> “Locating” is only a progress message. The bot records the supplied identifier; it does not discover or expose anyone's physical location.

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
