require("dotenv").config();
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { setupListen } = require("./utils/listen");
const { setupScheduler } = require("./utils/scheduler");

const app = express();
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

// Middleware để parse JSON body
app.use(express.json());

setupListen(bot);
setupScheduler(bot);

// Webhook endpoint
app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

// Setup webhook khi server start
bot
  .deleteWebHook()
  .then(() => {
    const webhookUrl = process.env.WEBHOOK_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook`;
    return bot.setWebHook(webhookUrl);
  })
  .then(() => {
    console.log(`✅ Webhook configured`);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Webhook endpoint: /webhook`);
    });
  })
  .catch((err) => {
    console.error("Webhook setup error:", err.message);
    // Vẫn start server để có thể debug
    app.listen(PORT, () => {
      console.log(`⚠️ Server running without webhook on port ${PORT}`);
    });
  });
