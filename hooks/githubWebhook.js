const { createResponse } = require("../lib/llm");
const { verifySignature, parseEvent } = require("../lib/github");
const { GITHUB_SUMMARY } = require("../utils/prompts");
const { createLogger } = require("../utils/logger");

const log = createLogger("GitHub");

const MAX_BODY_LENGTH = 4000;

function truncate(str, max) {
  if (!str || str.length <= max) return str || "";
  return str.slice(0, max) + "...";
}

function buildInput(data) {
  const lines = [
    `**Loại:** ${data.type === "pull_request" ? "Pull Request" : "Issue"}`,
    `**Repo:** ${data.repo}`,
    `**Tác giả:** @${data.user}`,
    data.labels?.length ? `**Labels:** ${data.labels.join(", ")}` : "",
    data.type === "pull_request" && data.base ? `**Branch:** ${data.head} → ${data.base}` : "",
    "",
    "**Tiêu đề:**",
    data.title,
    "",
    "**Nội dung:**",
    truncate(data.body, MAX_BODY_LENGTH),
  ].filter(Boolean);
  return lines.join("\n");
}

async function summarizeWithAI(data) {
  const input = buildInput(data);
  const query = GITHUB_SUMMARY.queryFormat + "\n\n" + input;
  const summary = await createResponse({
    instructions: GITHUB_SUMMARY.instructions,
    input: query,
    tools: [],
  });
  return summary;
}

async function sendToTelegram(bot, chatId, data, summary) {
  const typeLabel = data.type === "pull_request" ? "🔀 PR" : "📌 Issue";
  const msg = [
    `${typeLabel} mới: ${data.repo}`,
    "",
    summary,
    "",
    `🔗 ${data.htmlUrl}`,
  ].join("\n");

  await bot.sendMessage(chatId, msg, { disable_web_page_preview: true });
}

async function handleGitHubWebhook(bot, rawBody, signature, event, payload) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const chatId = process.env.GITHUB_NOTIFY_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!secret) {
    log.warn("GITHUB_WEBHOOK_SECRET chưa cấu hình — bỏ qua webhook.");
    return { ok: false, reason: "no_secret" };
  }
  if (!chatId) {
    log.warn("GITHUB_NOTIFY_CHAT_ID (hoặc TELEGRAM_CHAT_ID) chưa cấu hình.");
    return { ok: false, reason: "no_chat_id" };
  }
  if (!verifySignature(rawBody, signature, secret)) {
    log.warn("GitHub webhook: chữ ký không hợp lệ.");
    return { ok: false, reason: "invalid_signature" };
  }

  const data = parseEvent(event, payload);
  if (!data) {
    log.log("GitHub event bỏ qua:", event, payload?.action);
    return { ok: true, reason: "event_ignored" };
  }

  try {
    log.log("Tóm tắt", data.type, data.repo, data.title);
    const summary = await summarizeWithAI(data);
    await sendToTelegram(bot, chatId, data, summary);
    log.ok("Đã gửi tóm tắt tới Telegram");
    return { ok: true };
  } catch (err) {
    log.error("Xử lý GitHub webhook:", err?.message || err);
    return { ok: false, reason: "processing_error" };
  }
}

module.exports = { handleGitHubWebhook };
