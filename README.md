# BotWA - WhatsApp Bot Modular

WhatsApp Bot built with **Baileys** (multi-device) featuring modular command system, auto-join groups, VPS management, and more.

## Features

- **Auto Join** - Automatically join WhatsApp groups from shared invite links (owner-only trigger)
- **Auto Read** - Read messages automatically (group/private scope)
- **Auto Read Status** - Read WhatsApp status updates
- **Anti Link** - Delete group invite links from non-admins
- **Anti Call** - Auto-reject incoming calls
- **Auto Responder** - Custom auto-reply messages
- **Sticker Creator** - Convert images to WhatsApp stickers
- **JPM (Broadcast)** - Broadcast messages to groups
- **VPS Management** - Add/delete/fix SSH, VLESS, VMess, Trojan accounts
- **Trial & Premium** - Account trial and management system
- **Server Monitoring** - List servers and check status
- **Group Management** - Kick, tagall, hidetag, add/remove admins
- **Mode Toggle** - Switch between public/self mode

## Commands

| Command | Description |
|---------|-------------|
| `/menu` | Show all commands |
| `/ping` | Check bot status |
| `/info` | Show sender info |
| `/autojoin on/off` | Toggle auto join |
| `/autoread on/off` | Toggle auto read |
| `/antilink on/off` | Toggle anti link |
| `/anticall on/off` | Toggle anti call |
| `/mode public/self` | Switch bot mode |
| `/join <links>` | Join groups from links |
| `/joinall` | Join all saved group links |
| `/bc <text>` | Broadcast message to all groups |
| `/addssh <user> <pw> <domain>` | Add SSH account |
| `/delssh <user>` | Delete SSH account |
| `/addvless <user> <domain>` | Add VLESS account |
| `/addvmess <user> <domain>` | Add VMess account |
| `/addtrojan <user> <domain>` | Add Trojan account |
| `/trialssh <user> <pw> <domain>` | Create SSH trial |
| `/sticker` | Convert image to sticker |

> Type `/menu` after starting the bot to see the full command list.

## Requirements

- Node.js >= 22
- FFmpeg installed on system
- WhatsApp account (multi-device)

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/BotWA.git
cd BotWA
npm install
```

## Setup

1. Edit `servers/config_servers.js` with your VPS panel credentials:

```js
module.exports = {
  '1':  { token: 'YOUR_API_TOKEN', domain: 'YOUR_PANEL_DOMAIN', limitip: 0, kuota: 0 },
};
```

2. Edit `settings.json` with your owner number:

```json
{
  "ownerNumber": ["YOUR_WHATSAPP_NUMBER"],
  "mode": "public",
  "botName": "YourBotName"
}
```

3. Start the bot:

```bash
npm start
```

4. Scan the QR code with WhatsApp to connect.

## Run with PM2 (Recommended)

```bash
pm2 start ecosystem.config.js
pm2 logs
```

## Project Structure

```
BotWA/
├── index.js              # Main bot entry point
├── settings.json         # Bot settings (auto-generated)
├── package.json          # Dependencies
├── ecosystem.config.js   # PM2 config
├── config/               # Config files
├── servers/
│   ├── config_servers.js # VPS panel credentials
│   ├── config_packets.js # Package configs
│   └── proxy.js          # Proxy handler
├── function/             # Command modules (59 commands)
│   ├── menu.js
│   ├── autojoin.js
│   ├── antilink.js
│   ├── addssh.js
│   └── ...
└── jpm/                  # JPM broadcast data
```

## Notes

- Bot runs on **multi-device** Baileys (no need for legacy Web API)
- Session data is stored in `sessions/` directory (auto-created on first run)
- Settings are persisted in `settings.json` and auto-saved on changes

## License

MIT
