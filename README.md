# TruckersMP VTC Role Bot

A Discord bot that checks if a user is in your TruckersMP VTC (ID 81586) and assigns roles:
- ✅ VTC Member (if they’re in the VTC)
- ❌ Without VTC Members (if they’re not)

---

## 🚀 Setup

### 1. Local Development
1. Clone this repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vtc-role-bot.git
   cd vtc-role-bot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your values:
   ```
   BOT_TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   VTC_MEMBER_ROLE=your_vtc_member_role_id
   WITHOUT_VTC_ROLE=your_without_vtc_role_id
   VTC_ID=81586
   ```
4. Run the bot:
   ```bash
   npm start
   ```

---

### 2. Railway Deployment
1. Push your repo to GitHub.
2. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub.
3. In Railway dashboard → **Variables** tab → add:
   ```
   BOT_TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   VTC_MEMBER_ROLE=your_vtc_member_role_id
   WITHOUT_VTC_ROLE=your_without_vtc_role_id
   VTC_ID=81586
   ```
4. Railway auto-builds and runs your bot.
5. Check **Logs** to see `✅ Bot logged in as ...`.

---

## 🛠️ Usage
- Visit your Railway URL (`https://your-app.up.railway.app/`).
- Enter Discord ID + TruckersMP ID.
- The bot checks TMP API → assigns correct role.