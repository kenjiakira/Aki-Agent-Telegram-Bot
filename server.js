require("dotenv").config();
const path = require("path");
const express = require("express");
const { createAppBot } = require("./core/bot");
const { createLogger, printBanner } = require("./utils/logger");

let name = "bot-tele", version = "1.0.0";
try {
  const pkg = require(path.join(__dirname, "package.json"));
  if (pkg.name) name = pkg.name;
  if (pkg.version) version = pkg.version;
} catch {}
printBanner(name, version, "server");

const log = createLogger("Server");
const bot = createAppBot();
const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    log.warn("POST /webhook — body rỗng");
    return res.sendStatus(400);
  }
  res.sendStatus(200);
  setImmediate(() => {
    try {
      bot.processUpdate(body);
    } catch (err) {
      log.error("processUpdate:", err.message);
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
const webhookUrl = process.env.WEBHOOK_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook` : null);

bot
  .deleteWebHook()
  .then(() => (webhookUrl ? bot.setWebHook(webhookUrl).then(() => webhookUrl) : null))
  .then((url) => {
    if (url) log.ok("Webhook:", url);
    else log.warn("WEBHOOK_URL chưa set — Telegram chưa gửi update tới server.");
    app.listen(PORT, () => {
      log.ok("HTTP đang chạy port", PORT);
      log.log("Endpoints: POST /webhook, GET /health");
    });
  })
  .catch((err) => {
    log.error("Webhook setup:", err.message);
    app.listen(PORT, () => {
      log.warn("HTTP chạy port", PORT, "(webhook chưa cấu hình)");
    });
  });
