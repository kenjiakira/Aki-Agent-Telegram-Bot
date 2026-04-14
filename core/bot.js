require("dotenv").config({ override: true });
const TelegramBot = require("node-telegram-bot-api");
const { setupListen } = require("../utils/listen");
const { setupScheduler } = require("../utils/scheduler");
const { createLogger } = require("../utils/logger");

const log = createLogger("Bot");

function createAppBot() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    log.error("TELEGRAM_TOKEN thiếu trong .env");
    throw new Error("TELEGRAM_TOKEN is required");
  }
  const bot = new TelegramBot(token);
  try {
    const { getPrimaryProvider, getCallOrder } = require("../lib/llm");
    log.log(
      `[llm] LLM_PROVIDER=${JSON.stringify(process.env.LLM_PROVIDER ?? "")} → primary=${getPrimaryProvider()}, order=${getCallOrder().join(" → ")}`
    );
  } catch (e) {
    log.warn("[llm] Kiểm tra cấu hình LLM:", e.message);
  }
  setupListen(bot);
  setupScheduler(bot);
  log.ok("Listen & Scheduler đã gắn");
  return bot;
}

module.exports = { createAppBot };
