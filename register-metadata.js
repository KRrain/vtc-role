const fetch = require("node-fetch");
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

(async () => {
  const resp = await fetch(
    `https://discord.com/api/v10/applications/${CLIENT_ID}/role-connections/metadata`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify([
        {
          key: "in_vtc",
          name: "In VTC",
          description: "Whether the user is in the TruckersMP VTC",
          type: 1, // 1 = Integer
        },
      ]),
    }
  );

  const data = await resp.json();
  console.log("✅ Metadata registered:", data);
})();
