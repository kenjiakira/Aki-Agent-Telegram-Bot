const fs = require("fs");
const path = require("path");
const { fetchNewsByTopic } = require("../utils/rss");
const { TOPIC_NEWS, TOPIC_IDS } = require("../utils/prompts");
const { formatError } = require("../utils/errorMessages");
const { parseNewsItems, getItemPreview } = require("../utils/newsParser");

const CACHE_TTL_MS = 15 * 60 * 1000;
const pendingNews = new Map();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function getPrefix() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));
    return typeof cfg.prefix === "string" && cfg.prefix.length > 0 ? cfg.prefix : "/";
  } catch {
    return "/";
  }
}

function buildSelectionText(data) {
  const { items, selected } = data;
  const lines = items.map((item, i) => {
    const mark = selected.has(i) ? "✓" : "○";
    const preview = getItemPreview(item, 48);
    return `${mark} **${i + 1}.** ${preview}`;
  });
  return "📰 **Chọn tin muốn xem** (bấm số để chọn/bỏ chọn):\n\n" + lines.join("\n");
}

function buildSelectionKeyboard(selId, itemCount, selected) {
  const row1 = [];
  for (let i = 0; i < itemCount; i++) {
    row1.push({ text: `${selected.has(i) ? "✓ " : ""}${i + 1}`, callback_data: `news_sel_${selId}:${i}` });
  }
  const row2 = [
    { text: "📤 Gửi tất cả", callback_data: `news_sel_${selId}:all` },
    { text: "📨 Gửi đã chọn", callback_data: `news_sel_${selId}:go` },
  ];
  return { reply_markup: { inline_keyboard: [row1, row2] } };
}

const config = {
  name: "news",
  description: "Tin theo chủ đề: crypto, tech, world, ai",
  useBy: 0,
  category: "general",
  aliases: ["crypto", "tech", "world", "ai"],
  callbacks: ["news_sel_"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const parsed = ctx?.parsed;
  const args = (parsed?.args || []).map((a) => String(a).toLowerCase().trim());
  const invokedName = (parsed?.name || "").toLowerCase();

  const topicId = TOPIC_IDS.includes(invokedName) ? invokedName : args[0];

  if (!topicId || !TOPIC_IDS.includes(topicId)) {
    const prefix = getPrefix();
    const list = TOPIC_IDS.map((id) => `• ${prefix}${id} — ${TOPIC_NEWS.topics[id].label}`).join("\n");
    await bot.sendMessage(
      chatId,
      "📰 **Tin theo chủ đề**\n\nChọn một chủ đề:\n\n" + list + "\n\nVí dụ: " + prefix + "crypto hoặc " + prefix + "news ai",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang lấy tin...");

  try {
    const content = await fetchNewsByTopic(topicId);
    if (!content) {
      await bot.editMessageText("Không lấy được tin cho chủ đề này.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const header = TOPIC_NEWS.topics[topicId].newsHeader;
    const { items, fullText } = parseNewsItems(content);

    if (items.length >= 2) {
      const selId = randomId();
      const selected = new Set();
      const data = {
        items,
        chatId,
        messageId: statusMsg.message_id,
        topicHeader: header,
        selected,
        createdAt: Date.now(),
      };
      pendingNews.set(selId, data);

      const body = buildSelectionText(data);
      const keyboard = buildSelectionKeyboard(selId, items.length, selected);
      await bot.editMessageText(body, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: "Markdown",
        ...keyboard,
      });
      return;
    }

    const message = header + fullText;
    const maxLen = 4000;
    await bot.editMessageText(message.length <= maxLen ? message : message.substring(0, maxLen - 50) + "\n\n…", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(formatError(err, "rss"), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

async function handleCallback(bot, query, ctx) {
  const data = query.data;
  if (!data.startsWith("news_sel_")) return;

  const parts = data.slice("news_sel_".length).split(":");
  const selId = parts[0];
  const action = parts[1];

  const payload = pendingNews.get(selId);
  if (!payload) {
    await bot.answerCallbackQuery(query.id, { text: "⏱ Phiên chọn tin đã hết. Gửi lệnh lại." });
    return;
  }
  if (Date.now() - payload.createdAt > CACHE_TTL_MS) {
    pendingNews.delete(selId);
    await bot.answerCallbackQuery(query.id, { text: "⏱ Đã hết thời gian. Gửi lệnh lại." });
    return;
  }

  const { chatId, messageId, items, topicHeader, selected } = payload;

  if (action === "all") {
    pendingNews.delete(selId);
    const content = items.map((item, i) => `${i + 1}. ${item}`).join("\n\n");
    const message = topicHeader + content;
    const maxLen = 4000;
    await bot.editMessageText("✅ Đã gửi tin.", { chat_id: chatId, message_id: messageId });
    await bot.sendMessage(chatId, message.length <= maxLen ? message : message.substring(0, maxLen - 50) + "\n\n…", {
      parse_mode: "Markdown",
    });
    await bot.answerCallbackQuery(query.id, { text: "Đã gửi tất cả tin." });
    return;
  }

  if (action === "go") {
    if (selected.size === 0) {
      await bot.answerCallbackQuery(query.id, { text: "Chọn ít nhất 1 tin." });
      return;
    }
    pendingNews.delete(selId);
    const sorted = [...selected].sort((a, b) => a - b);
    const content = sorted.map((idx, i) => `${i + 1}. ${items[idx]}`).join("\n\n");
    const message = topicHeader + content;
    const maxLen = 4000;
    await bot.editMessageText("✅ Đã gửi tin đã chọn.", { chat_id: chatId, message_id: messageId });
    await bot.sendMessage(chatId, message.length <= maxLen ? message : message.substring(0, maxLen - 50) + "\n\n…", {
      parse_mode: "Markdown",
    });
    await bot.answerCallbackQuery(query.id, { text: "Đã gửi." });
    return;
  }

  const idx = parseInt(action, 10);
  if (!Number.isNaN(idx) && idx >= 0 && idx < items.length) {
    if (selected.has(idx)) selected.delete(idx);
    else selected.add(idx);
    payload.selected = selected;

    const body = buildSelectionText(payload);
    const keyboard = buildSelectionKeyboard(selId, items.length, selected);
    await bot.editMessageText(body, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      ...keyboard,
    });
    await bot.answerCallbackQuery(query.id);
  }
}

module.exports = { config, execute, handleCallback };
