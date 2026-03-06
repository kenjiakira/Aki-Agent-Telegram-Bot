/**
 * Chạy bot: polling (dev) hoặc webhook (không chạy HTTP server).
 * Dùng khi: npm run dev hoặc node main.js / node index.js
 */
const { createAppBot } = require("./core/bot");
const { createLogger } = require("./utils/logger");

const log = createLogger("Main");

const USE_WEBHOOK = process.env.USE_WEBHOOK === "true";
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const bot = createAppBot();

function startPolling() {
  return bot.deleteWebHook().then(() => {
    bot.startPolling();
    log.ok("Polling đã bật — bot sẵn sàng nhận lệnh");
  });
}

function startWebhook() {
  if (!WEBHOOK_URL) {
    log.warn("USE_WEBHOOK=true nhưng WEBHOOK_URL trống → chuyển sang polling");
    return startPolling();
  }
  return bot
    .deleteWebHook()
    .then(() => bot.setWebHook(WEBHOOK_URL))
    .then(() => {
      log.ok("Webhook đã set:", WEBHOOK_URL);
      log.log("Bot nhận update qua webhook (không polling).");
    })
    .catch((err) => {
      log.error("Webhook lỗi:", err.message);
      log.warn("Fallback: bật polling");
      return startPolling();
    });
}

if (USE_WEBHOOK && WEBHOOK_URL) {
  log.info("Khởi động chế độ webhook...");
  startWebhook();
} else {
  log.info("Khởi động chế độ polling (dev)...");
  bot.deleteWebHook().then(() => startPolling()).catch((err) => {
    log.warn("deleteWebHook:", err.message);
    startPolling();
  });
}
