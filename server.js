require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { setupListen } = require("./utils/listen");
const { setupScheduler } = require("./utils/scheduler");

const app = express();
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

app.use(express.json());

setupListen(bot);
setupScheduler(bot);

app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    console.warn("[webhook] Empty body");
    return res.sendStatus(400);
  }
  res.sendStatus(200);
  setImmediate(() => {
    try {
      bot.processUpdate(body);
    } catch (err) {
      console.error("[webhook] processUpdate error:", err.message);
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

bot
  .deleteWebHook()
  .then(() => {
    const webhookUrl = process.env.WEBHOOK_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook`;
    return bot.setWebHook(webhookUrl).then(() => webhookUrl);
  })
  .then((webhookUrl) => {
    console.log("✅ Webhook configured:", webhookUrl);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("🌐 Lệnh bot nhận qua POST /webhook — đảm bảo Start Command là: node server.js");
    });
  })
  .catch((err) => {
    console.error("Webhook setup error:", err.message);
    app.listen(PORT, () => {
      console.log(`⚠️ Server running without webhook on port ${PORT}`);
    });
  });
