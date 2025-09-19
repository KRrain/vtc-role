import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const url = `https://discord.com/api/v10/applications/${process.env.CLIENT_ID}/role-connections/metadata`;
const body = [
  {
    key: "in_vtc",
    name: "In VTC",
    description: "Whether user is inside VTC",
    type: 7, // boolean
  },
];

fetch(url, {
  method: "PUT",
  headers: {
    "Authorization": `Bot ${process.env.BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
})
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
