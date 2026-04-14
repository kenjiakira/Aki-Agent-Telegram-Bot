require("dotenv").config({ override: true });
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

const { handleGitHubWebhook } = require("./hooks/githubWebhook");

app.post(
  "/webhook/github",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const rawBody = (req.body && req.body.toString) ? req.body.toString("utf8") : JSON.stringify(req.body);
    const signature = req.headers["x-hub-signature-256"] || "";
    const event = req.headers["x-github-event"] || "";
    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch (_) {
      payload = req.body || {};
    }
    res.sendStatus(200);
    setImmediate(async () => {
      try {
        const result = await handleGitHubWebhook(bot, rawBody, signature, event, payload);
        if (!result.ok && result.reason === "invalid_signature") {
          log.warn("GitHub webhook: chữ ký không hợp lệ");
        }
      } catch (err) {
        log.error("GitHub webhook:", err?.message || err);
      }
    });
  }
);

app.use(express.json());

app.post("/webhook", (req, res) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    log.warn("POST /webhook — body rỗng");
    return res.sendStatus(400);
  }
  const updateId = body.update_id;
  log.log("Webhook nhận update", updateId != null ? `#${updateId}` : "");
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

app.listen(PORT, () => {
  log.ok("HTTP đang chạy port", PORT);
  log.log("Endpoints: POST /webhook, POST /webhook/github, GET /health");
  if (!webhookUrl) {
    log.warn("WEBHOOK_URL và RAILWAY_PUBLIC_DOMAIN đều trống — Telegram sẽ không gửi update. Cần set 1 trong 2 trên Railway.");
  } else {
    log.log("Sẽ đăng ký webhook:", webhookUrl);
  }
  bot
    .deleteWebHook()
    .then(() => (webhookUrl ? bot.setWebHook(webhookUrl).then(() => webhookUrl) : null))
    .then((url) => {
      if (url) log.ok("Webhook đã set:", url);
      else log.warn("WEBHOOK_URL chưa set — Telegram chưa gửi update tới server.");
    })
    .catch((err) => {
      log.error("Webhook setup:", err.message);
      log.warn("HTTP vẫn chạy — webhook có thể cấu hình lại sau.");
    });
});
