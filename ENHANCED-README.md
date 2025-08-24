# CatchTwo Enhanced - Pokétwo Autocatcher with Discord Bot

An enhanced version of the CatchTwo Pokétwo autocatcher with a comprehensive Discord bot for statistics tracking and management.

## 🆕 New Features

### Discord Bot Integration
- **Advanced Statistics**: View detailed stats with `/stats` command
- **Leaderboards**: Compare performance with `/leaderboard` command  
- **Real-time Monitoring**: Track multiple autocatcher accounts
- **User Management**: Register and manage autocatcher accounts
- **Recent Catches**: View recent catches with detailed information
- **Database Storage**: Persistent statistics storage with SQLite

### Enhanced Autocatcher
- **Improved Error Handling**: Better resilience and automatic recovery
- **Enhanced Captcha Detection**: More reliable captcha detection and handling
- **Bug Fixes**: Fixed multiple issues from the original version
- **Better Logging**: Enhanced logging with integration to Discord bot
- **Performance Improvements**: Optimized Pokemon catching logic
- **Graceful Shutdown**: Proper cleanup and state saving

## 📋 Requirements

- Node.js 16+ 
- Discord account tokens for autocatching
- Discord bot token (for Discord bot features)
- SQLite (included with dependencies)

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/kyan0045/catchtwo.git
cd catchtwo
npm install
```

### 2. Configuration

#### Configure Autocatcher (`config.json`):
```json
{
  "sleeping": false,
  "incenseMode": false,
  "reactAfterCatch": false,
  "logCatches": true,
  "lowIVLog": "10.00",
  "highIVLog": "85.00",
  "logWebhook": "YOUR_WEBHOOK_URL",
  "ownerID": ["YOUR_DISCORD_USER_ID"],
  "prefix": "!",
  "globalCatch": false,
  "blacklistedGuilds": ["716390832034414685"],
  "botApiUrl": "http://localhost:3000/api"
}
```

#### Configure Discord Bot (Environment Variables):
```bash
export BOT_TOKEN="your_discord_bot_token"
export CLIENT_ID="your_bot_client_id"
export GUILD_ID="your_discord_server_id"
```

#### Or update `bot-config.json`:
```json
{
  "bot": {
    "token": "YOUR_BOT_TOKEN_HERE",
    "clientId": "YOUR_CLIENT_ID_HERE", 
    "guildId": "YOUR_GUILD_ID_HERE"
  }
}
```

#### Setup Tokens (`tokens.txt`):
```
your_discord_token_1 guild_id_1
your_discord_token_2 guild_id_2
```

### 3. Running the System

#### Start Everything (Recommended):
```bash
node start-all.js
```

#### Or Start Components Separately:

**Autocatcher Only:**
```bash
node index-fixed.js
```

**Discord Bot Only:**
```bash
node bot.js
```

## 🤖 Discord Bot Commands

### Slash Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/stats [user]` | View detailed autocatcher statistics | `/stats @user` |
| `/leaderboard [type] [limit]` | View leaderboards by category | `/leaderboard shiny 10` |
| `/register <username> <token_hash> <guild_id>` | Register autocatcher account | `/register MyBot abc123 123456789` |
| `/recent [user] [limit]` | View recent catches | `/recent @user 5` |
| `/status` | View bot status and statistics | `/status` |
| `/help` | Show help information | `/help` |

### Leaderboard Types
- `total` - Total Pokemon caught
- `shiny` - Shiny Pokemon caught  
- `legendary` - Legendary Pokemon caught
- `mythical` - Mythical Pokemon caught
- `ultrabeast` - Ultra Beast Pokemon caught

## 🛠 Enhanced Autocatcher Commands

| Command | Description |
|---------|-------------|
| `!stats [pokemon]` | View statistics (enhanced) |
| `!ping` | Check latency |
| `!solved` | Resume after captcha |
| `!say <message>` | Send a message |
| `!help` | Show help |

## 📊 Features Overview

### Statistics Tracking
- **Real-time Stats**: Pokemon caught, shinies, legendaries, etc.
- **Performance Metrics**: Catch rates, uptime, efficiency
- **Historical Data**: Persistent storage of all catches
- **Multi-Account**: Track multiple autocatcher accounts
- **Export Options**: Database export capabilities

### Safety Features
- **Enhanced Captcha Detection**: Multiple detection methods
- **Automatic Pausing**: Safe handling of captchas and errors
- **Rate Limiting**: Intelligent delays and timing
- **Error Recovery**: Automatic reconnection and retry logic
- **Graceful Shutdown**: Proper cleanup and state saving

### Monitoring & Alerts
- **Webhook Integration**: Real-time notifications
- **Discord Integration**: Rich embeds and notifications
- **Status Monitoring**: Health checks and uptime tracking
- **Performance Alerts**: Low performance and error notifications

## 🔧 Configuration Options

### Autocatcher Settings (`config.json`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sleeping` | Boolean | `false` | Enable/disable autocatcher |
| `incenseMode` | Boolean | `false` | Interact with incenses |
| `reactAfterCatch` | Boolean | `false` | React to catch messages |
| `logCatches` | Boolean | `true` | Log all catches |
| `lowIVLog` | String | `"10.00"` | Low IV threshold for logging |
| `highIVLog` | String | `"85.00"` | High IV threshold for logging |
| `logWebhook` | String | `""` | Webhook URL for logging |
| `ownerID` | Array | `[]` | Discord user IDs of owners |
| `prefix` | String | `"!"` | Command prefix |
| `globalCatch` | Boolean | `false` | Catch in all servers or just specified |
| `blacklistedGuilds` | Array | `[]` | Servers to avoid |
| `botApiUrl` | String | `"http://localhost:3000/api"` | Discord bot API URL |

### Discord Bot Settings

| Setting | Type | Description |
|---------|------|-------------|
| `BOT_TOKEN` | String | Discord bot token |
| `CLIENT_ID` | String | Discord bot client ID |
| `GUILD_ID` | String | Discord server ID for slash commands |
| `PORT` | Number | API server port (default: 3000) |

## 📁 File Structure

```
catchtwo/
├── index-fixed.js              # Enhanced autocatcher
├── bot.js                      # Discord bot
├── autocatcher-integration.js  # Integration layer
├── start-all.js               # Startup script
├── config.json                # Autocatcher configuration
├── bot-config.json            # Bot configuration
├── tokens.txt                 # Discord account tokens
├── data/                      # Data storage
│   ├── autocatcher_stats.db   # SQLite database
│   ├── catches.txt            # Catch logs
│   └── levelup.json           # Levelup data
└── messages/                  # Message files
    ├── messages.txt           # Spam messages
    └── caughtMessages.txt     # Caught messages
```

## 🐛 Bug Fixes from Original

### Fixed Issues:
1. **Token Parsing**: Improved token validation and parsing
2. **Error Handling**: Better error recovery and logging  
3. **Memory Leaks**: Fixed event listener and interval cleanup
4. **Captcha Detection**: Enhanced captcha detection accuracy
5. **Pokemon Info Parsing**: More robust embed parsing
6. **Rate Limiting**: Better handling of Discord rate limits
7. **Reconnection Logic**: Improved reconnection handling
8. **Stats Calculation**: Fixed calculation errors in statistics
9. **Command Handling**: Enhanced command parsing and validation
10. **Database Issues**: Fixed database connection and query issues

### Enhanced Features:
- **Better Logging**: Structured logging with timestamps
- **Performance Monitoring**: Built-in performance tracking
- **Health Checks**: System health monitoring
- **Backup Systems**: Automatic data backup
- **Multi-threading**: Better resource utilization

## 🔒 Security & Safety

### Best Practices:
- **Token Security**: Secure token storage and handling
- **Rate Limiting**: Respect Discord's rate limits
- **Error Handling**: Graceful error handling
- **Logging**: Secure logging without sensitive data
- **Updates**: Regular dependency updates

### Safety Features:
- **Captcha Handling**: Automatic pause on captcha detection
- **Cooldown Management**: Intelligent timing and delays
- **Blacklist Support**: Avoid problematic servers
- **Emergency Stop**: Quick shutdown capabilities

## 📈 API Endpoints

The Discord bot exposes REST API endpoints for integration:

### `POST /api/update-stats`
Update autocatcher statistics
```json
{
  "discord_id": "user_discord_id",
  "stats": {
    "pokemon_caught": 150,
    "shiny_caught": 5,
    "legendary_caught": 10
  }
}
```

### `POST /api/log-catch`
Log a Pokemon catch
```json
{
  "discord_id": "user_discord_id", 
  "catch_data": {
    "pokemon_name": "Pikachu",
    "level": 25,
    "iv_percentage": 89.5,
    "pokemon_number": 25,
    "rarity": "Regular",
    "is_shiny": false
  }
}
```

## 🤝 Support

- **Discord Server**: [Join our support server](https://discord.gg/tXa2Hw5jHy)
- **GitHub Issues**: [Report bugs or request features](https://github.com/kyan0045/catchtwo/issues)
- **Documentation**: Check this README for detailed information

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational purposes only. Use at your own risk. The developers are not responsible for any consequences from using this software. Make sure to comply with Discord's Terms of Service and Pokétwo's rules.

## 🔄 Updates

Check for updates regularly:
```bash
git pull origin main
npm install
```

---

**CatchTwo Enhanced** - Taking Pokétwo automation to the next level! 🚀