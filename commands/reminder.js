const {
  createReminder,
  getRemindersByUser,
  cancelReminder,
} = require("../utils/database");
const { addMinutes, todayAtVN, tomorrowAtVN, formatVN } = require("../utils/time");

const config = {
  name: "reminder",
  description: "Đặt nhắc việc bằng nút bấm (không cần gõ lệnh)",
  useBy: 0,
  category: "general",
  aliases: ["nhac", "remind"],
  callbacks: ["reminder_"],
};

const pendingState = new Map();

function formatTriggerAt(date) {
  return formatVN(date);
}

function getMainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "➕ Tạo nhắc mới", callback_data: "reminder_new" },
          { text: "📋 Danh sách", callback_data: "reminder_list" },
        ],
      ],
    },
  };
}

function getTimeKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "15 phút", callback_data: "reminder_time_15m" },
          { text: "30 phút", callback_data: "reminder_time_30m" },
          { text: "1 tiếng", callback_data: "reminder_time_1h" },
          { text: "3 tiếng", callback_data: "reminder_time_3h" },
        ],
        [
          { text: "🌅 Sáng mai 8h", callback_data: "reminder_time_tomorrow8" },
          { text: "🌙 Tối nay 20h", callback_data: "reminder_time_tonight20" },
        ],
      ],
    },
  };
}

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text =
    "⏰ **Nhắc việc**\n\nChọn nút bên dưới để đặt nhắc hoặc xem danh sách. Không cần gõ lệnh phức tạp.";
  bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    ...getMainKeyboard(),
  });
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === "reminder_new") {
    pendingState.set(userId, {
      step: "awaiting_text",
      chatId,
      messageId: query.message.message_id,
    });
    await bot.answerCallbackQuery(query.id, { text: "Soạn nội dung cần nhắc và gửi 1 tin nhắn" });
    await bot.sendMessage(
      chatId,
      "✏️ Gửi **một tin nhắn** với nội dung cần nhắc (vd: _Gọi điện cho mẹ_). Sau đó chọn thời gian bằng nút.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (data === "reminder_list") {
    await bot.answerCallbackQuery(query.id);
    const list = await getRemindersByUser(userId);
    if (!list.length) {
      await bot.sendMessage(chatId, "📋 Chưa có nhắc nào đang chờ.");
      return;
    }
    let msg = "📋 **Nhắc đang chờ:**\n\n";
    const rows = list.slice(0, 10).map((r) => {
      const at = formatTriggerAt(new Date(r.trigger_at));
      msg += `• ${r.text}\n   ⏱ ${at}\n\n`;
      const short = r.text.length > 20 ? r.text.slice(0, 20) + "…" : r.text;
      return [{ text: `❌ ${short}`, callback_data: `reminder_cancel_${r.id}` }];
    });
    await bot.sendMessage(chatId, msg.trim(), {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: rows },
    });
    return;
  }

  if (data.startsWith("reminder_cancel_")) {
    const id = data.replace("reminder_cancel_", "");
    try {
      await cancelReminder(id, userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã hủy nhắc" });
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: query.message.message_id }
      );
      await bot.sendMessage(chatId, "✅ Đã hủy nhắc.");
    } catch (e) {
      await bot.answerCallbackQuery(query.id, { text: "Không hủy được" });
    }
    return;
  }

  if (data.startsWith("reminder_time_")) {
    const state = pendingState.get(userId);
    if (!state || state.step !== "awaiting_time" || !state.text) {
      await bot.answerCallbackQuery(query.id, { text: "Phiên hết hạn. Dùng /reminder để tạo lại." });
      return;
    }

    const key = data.replace("reminder_time_", "");
    let triggerAt;
    let label;
    switch (key) {
      case "15m":
        triggerAt = addMinutes(15);
        label = "sau 15 phút";
        break;
      case "30m":
        triggerAt = addMinutes(30);
        label = "sau 30 phút";
        break;
      case "1h":
        triggerAt = addMinutes(60);
        label = "sau 1 tiếng";
        break;
      case "3h":
        triggerAt = addMinutes(180);
        label = "sau 3 tiếng";
        break;
      case "tonight20":
        triggerAt = todayAtVN(20, 0);
        label = "tối nay 20:00";
        break;
      case "tomorrow8":
        triggerAt = tomorrowAtVN(8, 0);
        label = "sáng mai 8:00";
        break;
      default:
        await bot.answerCallbackQuery(query.id, { text: "Chọn lại thời gian" });
        return;
    }

    try {
      await createReminder(userId, chatId, state.text, triggerAt);
      pendingState.delete(userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã đặt nhắc!" });
      await bot.sendMessage(
        chatId,
        `✅ **Đã đặt nhắc**\n\n📌 ${state.text}\n⏱ ${label} (${formatTriggerAt(triggerAt)})`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await bot.answerCallbackQuery(query.id, { text: "Lỗi: " + err.message });
    }
    return;
  }
}

async function handleMessage(bot, msg) {
  const userId = msg.from?.id;
  const text = (msg.text || "").trim();
  if (!userId || !text) return false;

  const state = pendingState.get(userId);
  if (!state || state.step !== "awaiting_text") return false;

  pendingState.set(userId, {
    ...state,
    step: "awaiting_time",
    text: text.slice(0, 500),
  });

  await bot.sendMessage(
    msg.chat.id,
    `⏱ Chọn thời gian nhắc cho: _${text.slice(0, 100)}_`,
    {
      parse_mode: "Markdown",
      ...getTimeKeyboard(),
    }
  );
  return true;
}

module.exports = {
  config,
  execute,
  handleCallback,
  handleMessage,
  getMainKeyboard,
  pendingState,
};
