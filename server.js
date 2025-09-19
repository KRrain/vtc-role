console.log("ENV CHECK:", {
  BOT_TOKEN: !!process.env.BOT_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET ? "✅ set" : "❌ missing",
});

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// ====== CONFIG FROM ENV ======
const TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VTC_MEMBER_ROLE = process.env.VTC_MEMBER_ROLE;
const WITHOUT_VTC_ROLE = process.env.WITHOUT_VTC_ROLE;
const VTC_ID = process.env.VTC_ID || "81586";
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL; // e.g. https://your-app.up.railway.app
const SERVER_INVITE = process.env.SERVER_INVITE || "https://discord.gg/yourserver"; // fallback invite
// ==============================

if (!TOKEN || !GUILD_ID || !VTC_MEMBER_ROLE || !WITHOUT_VTC_ROLE) {
  console.error("❌ Missing .env values. Check BOT_TOKEN, GUILD_ID, VTC_MEMBER_ROLE, WITHOUT_VTC_ROLE.");
  process.exit(1);
}

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(TOKEN);

// ====== LINKED ROLES ENDPOINTS ======

// Metadata schema for Discord Linked Roles
app.get("/metadata", (req, res) => {
  res.json([
    {
      key: "in_vtc",
      name: "In TruckersMP VTC",
      description: "Whether the user is in the VTC",
      type: 7, // BOOLEAN
    },
  ]);
});

// Entry page for verification
app.get("/linked-role", (req, res) => {
  const redirect = encodeURIComponent(`${BASE_URL}/callback`);
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>VTC Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #2c2f33;
            color: #ffffff;
            text-align: center;
            padding: 50px;
          }
          .container {
            background: #23272a;
            padding: 40px;
            border-radius: 12px;
            display: inline-block;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          }
          h2 {
            margin-bottom: 20px;
          }
          .discord-btn {
            display: inline-block;
            background-color: #5865F2;
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            transition: background 0.3s ease;
          }
          .discord-btn:hover {
            background-color: #4752c4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>TruckersMP VTC Verification</h2>
          <p>Click below to log in with Discord and verify your membership.</p>
          <a class="discord-btn" href="https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify">
            Login with Discord
          </a>
        </div>
      </body>
    </html>
  `);
});

// OAuth2 callback with styled response
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send(`
      <html><body style="background:#2c2f33;color:white;text-align:center;padding:50px;">
        <h2>❌ Verification Failed</h2>
        <p>Missing <code>?code</code> parameter.</p>
      </body></html>
    `);
  }

  try {
    // Exchange code for token
    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${BASE_URL}/callback`,
      }),
    });

    const tokenData = await tokenResp.json();
    if (tokenData.error) {
      return res.send(`
        <html><body style="background:#2c2f33;color:white;text-align:center;padding:50px;">
          <h2>❌ OAuth2 Error</h2>
          <p>${tokenData.error_description}</p>
        </body></html>
      `);
    }

    // Get user info
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResp.json();

    // Check TruckersMP membership
    const vtcResp = await fetch(`https://api.truckersmp.com/v2/vtc/${VTC_ID}/members`);
    const vtcData = await vtcResp.json();
    const members = vtcData.response?.members || [];
    const inVtc = members.some(m => Number(m.user_id) === Number(userData.id));

    // Update Discord roles
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userData.id);

    if (inVtc) {
      await member.roles.add(VTC_MEMBER_ROLE);
      await member.roles.remove(WITHOUT_VTC_ROLE).catch(() => {});
    } else {
      await member.roles.add(WITHOUT_VTC_ROLE);
      await member.roles.remove(VTC_MEMBER_ROLE).catch(() => {});
    }

    // Styled response
    res.send(`
      <html>
        <body style="background:#2c2f33;color:white;text-align:center;padding:50px;">
          <h2>${inVtc ? "✅ Verification Complete" : "ℹ️ Verification Complete"}</h2>
          <p>User: <strong>${userData.username}#${userData.discriminator}</strong></p>
          <p>Status: ${inVtc ? "🎉 You are in the VTC!" : "❌ You are NOT in the VTC."}</p>
          <br>
          <a href="${SERVER_INVITE}" style="display:inline-block;background:#5865F2;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Back to Discord Server
          </a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.send(`
      <html><body style="background:#2c2f33;color:white;text-align:center;padding:50px;">
        <h2>❌ Error</h2>
        <p>${err.message}</p>
      </body></html>
    `);
  }
});

// ====== MANUAL FORM (still here for testing) ======
app.get("/", (req, res) => {
  res.send(`
    <h2>Manual Link (Testing)</h2>
    <form method="POST" action="/link">
      <label>Discord ID: <input name="discordId" required></label><br><br>
      <label>TruckersMP ID: <input name="tmpId" required></label><br><br>
      <button type="submit">Link</button>
    </form>
  `);
});

app.post("/link", async (req, res) => {
  const discordId = req.body.discordId.trim();
  const tmpId = Number(req.body.tmpId.trim());

  try {
    const response = await fetch(`https://api.truckersmp.com/v2/vtc/${VTC_ID}/members`);
    const data = await response.json();
    const members = data.response?.members || [];
    const inVtc = members.some(m => Number(m.user_id) === tmpId);

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordId);

    if (inVtc) {
      await member.roles.add(VTC_MEMBER_ROLE);
      await member.roles.remove(WITHOUT_VTC_ROLE).catch(() => {});
      res.send(`✅ ${member.user.tag} is in the VTC → VTC Member role added.`);
    } else {
      await member.roles.add(WITHOUT_VTC_ROLE);
      await member.roles.remove(VTC_MEMBER_ROLE).catch(() => {});
      res.send(`ℹ️ ${member.user.tag} is NOT in VTC ${VTC_ID} → Without VTC Members role added.`);
    }
  } catch (err) {
    console.error(err);
    res.send("❌ Error: " + err.message);
  }
});

// Start web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));
