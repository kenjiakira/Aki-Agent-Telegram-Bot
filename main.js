require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { setupListen } = require("./utils/listen");
const { setupScheduler } = require("./utils/scheduler");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

setupListen(bot);
setupScheduler(bot);

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
