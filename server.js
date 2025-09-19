require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// ===== ENV CONFIG =====
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL; // e.g. https://vtc-role-production.up.railway.app
const GUILD_ID = process.env.GUILD_ID;
const VTC_ID = process.env.VTC_ID || "81586";
// =======================

// Discord client (only needed if you also want to assign roles in server)
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});
client.login(BOT_TOKEN);

// ---------- ROUTES ----------

// 1. Homepage
app.get("/", (req, res) => {
  res.send(`<a href="/linked-role">🔗 Link your role</a>`);
});

// 2. Start Linked Role OAuth
app.get("/linked-role", (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    BASE_URL + "/linked-role/callback"
  )}&response_type=code&scope=role_connections.write%20identify`;
  res.redirect(url);
});

// 3. Callback after user authorizes
app.get("/linked-role/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code received");

  try {
    // Exchange code for access token
    const tokenResp = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: BASE_URL + "/linked-role/callback",
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) {
      console.error(tokenData);
      return res.send("❌ Failed to exchange code for token");
    }

    // Get user info
    const userResp = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userResp.json();

    // Check TruckersMP VTC
    const vtcResp = await fetch(
      `https://api.truckersmp.com/v2/vtc/${81586}/members`
    );
    const vtcData = await vtcResp.json();
    const members = vtcData.response?.members || [];
    const inVtc = members.some((m) => String(m.user_id) === String(user.id));

    // Update Discord Linked Role metadata
    const metadataResp = await fetch(
      `https://discord.com/api/users/@me/applications/${CLIENT_ID}/role-connection`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform_name: "TruckersMP",
          platform_username: user.username,
          metadata: { in_vtc: inVtc ? 1 : 0 },
        }),
      }
    );

    if (metadataResp.ok) {
      res.send(
        `✅ Linked roles updated! ${user.username} is ${
          inVtc ? "in VTC ✅" : "NOT in VTC ❌"
        }.`
      );
    } else {
      const err = await metadataResp.text();
      console.error(err);
      res.send("❌ Failed to update metadata: " + err);
    }
  } catch (err) {
    console.error(err);
    res.send("❌ Error: " + err.message);
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🌍 Web server running on http://localhost:${PORT}`)
);
