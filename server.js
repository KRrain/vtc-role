require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// ====== CONFIG ======
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/linked-role/callback";
const GUILD_ID = process.env.GUILD_ID;
const VTC_ID = process.env.VTC_ID || "81586";
const VTC_MEMBER_ROLE = process.env.VTC_MEMBER_ROLE;
const WITHOUT_VTC_ROLE = process.env.WITHOUT_VTC_ROLE;
// =====================

if (!TOKEN || !CLIENT_ID || !CLIENT_SECRET || !GUILD_ID || !VTC_MEMBER_ROLE || !WITHOUT_VTC_ROLE) {
  console.error("❌ Missing .env values. Check your .env file.");
  process.exit(1);
}

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
client.once("ready", () => console.log(`✅ Bot logged in as ${client.user.tag}`));
client.login(TOKEN);

// =====================
// Homepage
// =====================
app.get("/", (req, res) => {
  res.send(`
    <h2>TruckersMP VTC Role Bot</h2>
    <p><a href="/linked-role">Start Linked Role Verification</a></p>
  `);
});

// =====================
// Step 1: Redirect to Discord OAuth2
// =====================
app.get("/linked-role", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=identify+role_connections.write`;

  res.redirect(url);
});

// =====================
// Step 2: Handle Discord OAuth2 callback
// =====================
app.get("/linked-role/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No OAuth2 code provided.");

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.send("❌ Failed to get Discord access token: " + JSON.stringify(tokenData));
    }

    // Get Discord user
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // ---- Check TruckersMP VTC ----
    const tmpRes = await fetch(`https://api.truckersmp.com/v2/vtc/${VTC_ID}/members`);
    const tmpData = await tmpRes.json();
    const inVtc = tmpData?.response?.members?.some(m => String(m.user_id) === String(user.id));

    // ---- Update Linked Role Metadata ----
    const metadata = {
      in_vtc: inVtc ? 1 : 0,
    };

    await fetch(`https://discord.com/api/users/@me/applications/${CLIENT_ID}/role-connection`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform_name: "TruckersMP",
        platform_username: user.username,
        metadata,
      }),
    });

    // ---- Assign Discord role ----
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (member) {
      if (inVtc) {
        await member.roles.add(VTC_MEMBER_ROLE).catch(() => {});
        await member.roles.remove(WITHOUT_VTC_ROLE).catch(() => {});
      } else {
        await member.roles.add(WITHOUT_VTC_ROLE).catch(() => {});
        await member.roles.remove(VTC_MEMBER_ROLE).catch(() => {});
      }
    }

    res.send(
      `<h2>✅ Linked Role Complete</h2><p>Hello, ${user.username}! You are ${
        inVtc ? "in the VTC 🎉" : "NOT in the VTC 🚫"
      }.</p>`
    );
  } catch (err) {
    console.error("❌ Error in OAuth2 flow:", err);
    res.send("❌ Error: " + err.message);
  }
});

// =====================
// Start server
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));
