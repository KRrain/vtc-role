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

// Homepage (simple form for manual linking)
app.get("/", (req, res) => {
  res.send(`
    <h2>TruckersMP VTC Role Bot</h2>
    <p><a href="/linked-role">Go to Linked Role Verification</a></p>
    <form method="POST" action="/link">
      <label>Discord ID: <input name="discordId" required></label><br><br>
      <label>TruckersMP ID: <input name="tmpId" required></label><br><br>
      <button type="submit">Link</button>
    </form>
  `);
});

// Link handler
app.post("/link", async (req, res) => {
  const discordId = req.body.discordId.trim();
  const tmpId = Number(req.body.tmpId.trim());

  try {
    const url = `https://api.truckersmp.com/v2/vtc/${VTC_ID}/members`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`TruckersMP API error: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      throw new Error(`Invalid JSON from TMP API. First part: ${text.slice(0, 200)}`);
    }

    const members = data?.response?.members || [];
    const inVtc = members.some(m => Number(m.user_id) === tmpId);

    // Fetch Discord user
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordId);

    if (inVtc) {
      await member.roles.add(VTC_MEMBER_ROLE);
      await member.roles.remove(WITHOUT_VTC_ROLE).catch(() => {});
      res.send(`✅ ${member.user.tag} is in VTC ${VTC_ID} → VTC Member role added.`);
    } else {
      await member.roles.add(WITHOUT_VTC_ROLE);
      await member.roles.remove(VTC_MEMBER_ROLE).catch(() => {});
      res.send(`ℹ️ ${member.user.tag} is NOT in VTC ${VTC_ID} → Without VTC role added.`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.send("❌ Error: " + err.message);
  }
});

// Start web server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));
