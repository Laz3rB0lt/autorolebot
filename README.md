# AutoRole Bot

A production-ready Discord bot built with **Node.js** and **discord.js v14** featuring autorole and interactive button-based role menus.

## Features

### 🤖 Autorole
- Automatically assign one or multiple roles when members join
- Optional configurable delay before role assignment
- Toggle to ignore bots
- Reapply previous roles when members rejoin (stores roles on leave)
- Per-guild configuration saved to persistent storage

### 🎛️ Interactive Role Menus
- Create button-based role menus with one command
- Users click buttons to toggle roles on/off
- Multiple role menus per server
- Menus persist across bot restarts
- Safe error handling for missing roles or permission issues

## Commands

All commands require `Manage Guild` permission.

### Autorole Commands
```
/autorole add <role>              # Add a role to autorole list
/autorole remove <role>           # Remove a role from autorole list
/autorole delay <seconds>         # Set delay before assigning roles
/autorole ignorebots <true|false> # Toggle bot account filtering
```

### Role Menu Commands
```
/rolemenu create <role> [label]   # Create a button role menu
```

## Setup

### Prerequisites
- Node.js 16.9.0 or higher
- A Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### Local Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/autorolebot.git
   cd autorolebot
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set your bot token
   ```bash
   # Windows PowerShell
   $env:BOT_TOKEN="your-token-here"
   
   # macOS/Linux bash
   export BOT_TOKEN="your-token-here"
   ```

4. Start the bot
   ```bash
   npm start
   ```

### Required Discord Intents
The bot uses the following Gateway Intents:
- `Guilds` – Required for basic server awareness
- `GuildMessages` – Required for command handling
- `GuildMembers` – Required for autorole features
- `MessageContent` – Required to read message content for commands

Make sure these are enabled in the Discord Developer Portal.

### Required Bot Permissions
For the bot to work properly, invite it with these permissions:
- `Manage Roles` – To assign and remove roles
- `Send Messages` – To respond to commands
- `Embed Links` – For formatted responses

Invite URL Generator:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot
```

## Deployment

### Option 1: Railway

1. Push your code to GitHub (see below)
2. Go to [Railway.app](https://railway.app) and sign in
3. Create a new project → Deploy from GitHub
4. Select this repository
5. Configure environment variables:
   - `BOT_TOKEN` – Your Discord bot token
   - `NODE_ENV` – Set to `production` (optional)
6. Railway will automatically detect Node.js and run `npm start`

### Option 2: Other Hosting
The bot can run on any Node.js hosting service (Heroku, Replit, VPS, etc.). Just ensure:
- Node.js ^16.9.0 is available
- `BOT_TOKEN` environment variable is set
- The bot can write to disk (`data.json`)

## Project Structure

```
autorolebot/
├─ src/
│  ├─ index.js        # Main entry point, client & event handlers
│  ├─ storage.js      # JSON persistence helper
│  ├─ autorole.js     # Autorole configuration & events
│  └─ roles.js        # Button role menu logic
├─ data.json          # Guild configuration storage
├─ package.json       # Dependencies
└─ README.md          # This file
```

## How It Works

### Autorole Flow
1. Member joins the server
2. Bot checks autorole config for the guild
3. If delay is set, waits that many seconds
4. Assigns configured roles (catching errors if missing or due to hierarchy)
5. If member previously left with roles, those are restored too

### Role Menu Flow
1. Admin runs `!rolemenu create @role "Custom Label"`
2. Bot sends a message with a button in the current channel
3. Menu is stored in `data.json` for persistence
4. When user clicks button, the bot toggles the role (add if missing, remove if present)
5. User gets an ephemeral confirmation message

## Error Handling

The bot is designed to be resilient:
- Missing roles won't crash the bot
- Role hierarchy issues are caught and logged
- Stale role menu messages are cleaned up at startup
- Unhandled promise rejections are caught and logged

## Configuration Storage

Guild configuration is stored in `data.json`:
```json
{
  "guildId": {
    "autorole": {
      "roles": ["roleId1", "roleId2"],
      "delay": 5,
      "ignoreBots": true
    },
    "previousRoles": {
      "memberId": ["roleId1", "roleId2"]
    },
    "roleMenus": [
      {
        "messageId": "...",
        "channelId": "...",
        "roleId": "...",
        "label": "Custom Label"
      }
    ]
  }
}
```

## Troubleshooting

### Bot doesn't respond to commands
- Check bot has `Send Messages` permission
- Verify `MESSAGE_CONTENT` intent is enabled in Developer Portal
- Check bot role is high enough in the hierarchy

### Autorole not working
- Verify bot role is **above** the roles it's trying to assign
- Check `GuildMembers` intent is enabled
- Review logs for specific errors

### Role menu buttons don't work
- Ensure bot has `Manage Roles` permission
- Check the role still exists on the server
- Verify the button's custom ID is intact (don't edit messages with buttons)

## License

MIT

## Support

Found a bug or have a feature request? Please open an issue on GitHub.
