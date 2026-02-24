require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { setupListen } = require("./utils/listen");
const { setupScheduler } = require("./utils/scheduler");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

setupListen(bot);
setupScheduler(bot);

const USE_WEBHOOK = process.env.USE_WEBHOOK === "true";
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (USE_WEBHOOK && WEBHOOK_URL) { 
  console.log("🌐 Starting bot in WEBHOOK mode...");
  
  bot
    .deleteWebHook()
    .then(() => {
      return bot.setWebHook(WEBHOOK_URL);
    })
    .then(() => {
      console.log(`✅ Webhook set to: ${WEBHOOK_URL}`);
      console.log("Bot is running (webhook mode)...");
    })
    .catch((err) => {
      console.error("Webhook error:", err.message); 
      bot.startPolling();
      console.log("⚠️ Fallback to polling mode...");
    });
} else {
  console.log("🔧 Starting bot in POLLING mode (dev)...");
  
  bot
    .deleteWebHook()
    .then(() => {
      bot.startPolling();
      console.log("Bot is running (polling)...");
    })
    .catch((err) => {
      console.error("Webhook:", err.message);
      bot.startPolling();
      console.log("Bot is running (polling)...");
    });
}
