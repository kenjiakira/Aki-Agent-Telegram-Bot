const fs = require("fs");
const path = require("path");
const { addAutoNewsSubscriber, removeAutoNewsSubscriber, isAutoNewsSubscriber } = require("../utils/database");
const { formatError } = require("../utils/errorMessages");

function getPrefix() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../config.json"), "utf8"));
    return typeof cfg.prefix === "string" && cfg.prefix.length > 0 ? cfg.prefix : "/";
  } catch {
    return "/";
  }
}

function buildWelcomeSteps(isSubscribed) {
  const p = getPrefix();
  let text =
    "👋 Chào bạn!\n\n" +
    "Bước 1. Bạn đã kết nối bot — có thể dùng ngay.\n\n" +
    "Bước 2. Xem tin & lệnh:\n" +
    `• ${p}help — hướng dẫn đầy đủ\n` +
    `• ${p}news hoặc ${p}crypto, ${p}tech, ${p}world, ${p}ai — xem tin theo chủ đề\n\n` +
    "Bước 3. Nhận tin tự động mỗi ngày lúc 8:00 (gửi vào đây):\n";
  if (isSubscribed) {
    text += "📌 Trạng thái: Đã bật. Bấm nút bên dưới nếu muốn tắt.";
  } else {
    text += "📌 Trạng thái: Chưa bật. Bấm nút bên dưới để đăng ký.\n";
    text += "_(Không đăng ký vẫn dùng bot bình thường: help, news, tin theo chủ đề…)_";
  }
  return text;
}

function getStartKeyboard(isSubscribed) {
  const row = isSubscribed
    ? [{ text: "🔕 Tắt nhận tin tự động", callback_data: "start_unsub" }]
    : [{ text: "📬 Nhận tin tự động mỗi ngày", callback_data: "start_sub" }];
  return { reply_markup: { inline_keyboard: [row] } };
}

const config = {
  name: "start",
  description: "Bắt đầu — hướng dẫn từng bước & đăng ký nhận tin tự động",
  useBy: 0,
  category: "general",
  callbacks: ["start_sub", "start_unsub"],
};

function isGroup(chat) {
  return chat && (chat.type === "group" || chat.type === "supergroup");
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const name = (ctx?.parsed?.name || "").toLowerCase();

  if (isGroup(msg.chat)) {
    await bot.sendMessage(
      chatId,
      "👋 Trong group gõ /news để xem tin theo chủ đề và **đăng ký** (hoặc **hủy**) nhận tin tự động mỗi ngày 8:00. Mỗi group chỉ đăng ký một lần.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (name === "unsubscribenews" || name === "huydongbo") {
    if (!userId) {
      await bot.sendMessage(chatId, "Không xác định được user.");
      return;
    }
    try {
      const wasSubscribed = await isAutoNewsSubscriber(userId);
      if (!wasSubscribed) {
        await bot.sendMessage(chatId, "Bạn chưa đăng ký nhận tin tự động. Gõ /start để bật.");
        return;
      }
      await removeAutoNewsSubscriber(userId);
      await bot.sendMessage(
        chatId,
        "✅ Đã tắt nhận tin tự động.\n\nBạn sẽ không còn nhận tin mỗi ngày lúc 8:00. Gõ /start nếu muốn bật lại."
      );
    } catch (err) {
      await bot.sendMessage(chatId, formatError(err, "database"));
    }
    return;
  }

  let isSubscribed = false;
  if (userId) {
    try {
      isSubscribed = await isAutoNewsSubscriber(userId);
    } catch {
    }
  }

  const text = buildWelcomeSteps(isSubscribed);
  const keyboard = getStartKeyboard(isSubscribed);
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown", ...keyboard });
}

async function handleCallback(bot, query, ctx) {
  const data = query.data;
  if (data !== "start_sub" && data !== "start_unsub") return;

  const chatId = query.message.chat.id;
  const userId = query.from?.id;
  if (!userId) {
    await bot.answerCallbackQuery(query.id, { text: "Không xác định được user." });
    return;
  }

  try {
    if (data === "start_sub") {
      const alreadySubscribed = await isAutoNewsSubscriber(userId);
      if (alreadySubscribed) {
        await bot.answerCallbackQuery(query.id, { text: "Bạn đã đăng ký nhận tin tự động rồi." });
        return;
      }
      await addAutoNewsSubscriber(userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã bật nhận tin tự động mỗi ngày 8:00." });
      await bot.editMessageText(buildWelcomeSteps(true), {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
        ...getStartKeyboard(true),
      });
    } else {
      const wasSubscribed = await isAutoNewsSubscriber(userId);
      if (!wasSubscribed) {
        await bot.answerCallbackQuery(query.id, { text: "Bạn chưa đăng ký nhận tin tự động." });
        return;
      }
      await removeAutoNewsSubscriber(userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã tắt nhận tin tự động." });
      await bot.editMessageText(buildWelcomeSteps(false), {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
        ...getStartKeyboard(false),
      });
    }
  } catch (err) {
    await bot.answerCallbackQuery(query.id, { text: "Lỗi: " + (err.message || "thử lại sau.") });
  }
}

module.exports = { config, execute, handleCallback };
