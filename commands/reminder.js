const {
  createReminder,
  getRemindersByUser,
  cancelReminder,
  getReminderPresetsByUser,
  saveReminderPreset,
  deleteReminderPreset,
} = require("../utils/database");
const { addMinutes, todayAtVN, tomorrowAtVN, formatVN } = require("../utils/time");

/** Presets mặc định; user thêm riêng qua ⚙️ Presets */
const DEFAULT_TIME_PRESETS = [
  { key: "15m", label: "15 phút", type: "minutes", value: 15 },
  { key: "30m", label: "30 phút", type: "minutes", value: 30 },
  { key: "1h", label: "1 tiếng", type: "minutes", value: 60 },
  { key: "3h", label: "3 tiếng", type: "minutes", value: 180 },
  { key: "tonight20", label: "🌙 Tối nay 20h", type: "today", hour: 20, minute: 0 },
  { key: "tomorrow8", label: "🌅 Sáng mai 8h", type: "tomorrow", hour: 8, minute: 0 },
];

const REMINDER_OPTIONS = {
  maxTextLength: 500,
  mainButtons: [
    { text: "➕ Tạo nhắc mới", callback_data: "reminder_new" },
    { text: "📋 Danh sách", callback_data: "reminder_list" },
    { text: "⚙️ Presets", callback_data: "reminder_presets" },
  ],
  maxListItems: 10,
  cancelButtonTextLength: 20,
  timeKeyboardRowSize: 4,
};

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
      inline_keyboard: [REMINDER_OPTIONS.mainButtons],
    },
  };
}

/** Presets = mặc định + presets của user (từ DB). */
async function getMergedPresets(userId) {
  const custom = await getReminderPresetsByUser(userId).catch(() => []);
  const customNormalized = custom.map((p) => ({
    key: p.key,
    label: p.label,
    type: p.type,
    value: p.value,
    hour: p.hour,
    minute: p.minute,
  }));
  return [...DEFAULT_TIME_PRESETS, ...customNormalized];
}

async function getTimeKeyboard(userId) {
  const presets = await getMergedPresets(userId);
  const rowSize = REMINDER_OPTIONS.timeKeyboardRowSize;
  const rows = [];
  for (let i = 0; i < presets.length; i += rowSize) {
    rows.push(
      presets.slice(i, i + rowSize).map((p) => ({
        text: p.label,
        callback_data: `reminder_time_${p.key}`,
      }))
    );
  }
  return {
    reply_markup: { inline_keyboard: rows },
  };
}

function resolveTimeFromPreset(preset) {
  if (preset.type === "minutes") {
    return { triggerAt: addMinutes(preset.value), label: preset.label };
  }
  if (preset.type === "today") {
    const triggerAt = todayAtVN(preset.hour ?? 0, preset.minute ?? 0);
    return { triggerAt, label: preset.label };
  }
  if (preset.type === "tomorrow") {
    const triggerAt = tomorrowAtVN(preset.hour ?? 0, preset.minute ?? 0);
    return { triggerAt, label: preset.label };
  }
  return null;
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
    const maxItems = REMINDER_OPTIONS.maxListItems;
    const maxLen = REMINDER_OPTIONS.cancelButtonTextLength;
    let msg = "📋 **Nhắc đang chờ:**\n\n";
    const rows = list.slice(0, maxItems).map((r) => {
      const at = formatTriggerAt(new Date(r.trigger_at));
      msg += `• ${r.text}\n   ⏱ ${at}\n\n`;
      const short = r.text.length > maxLen ? r.text.slice(0, maxLen) + "…" : r.text;
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
    const presets = await getMergedPresets(userId);
    const preset = presets.find((p) => p.key === key);
    if (!preset) {
      await bot.answerCallbackQuery(query.id, { text: "Chọn lại thời gian" });
      return;
    }
    const resolved = resolveTimeFromPreset(preset);
    if (!resolved) {
      await bot.answerCallbackQuery(query.id, { text: "Lỗi preset" });
      return;
    }
    try {
      await createReminder(userId, chatId, state.text, resolved.triggerAt);
      pendingState.delete(userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã đặt nhắc!" });
      await bot.sendMessage(
        chatId,
        `✅ **Đã đặt nhắc**\n\n📌 ${state.text}\n⏱ ${resolved.label} (${formatTriggerAt(resolved.triggerAt)})`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await bot.answerCallbackQuery(query.id, { text: "Lỗi: " + err.message });
    }
    return;
  }

  if (data === "reminder_presets") {
    await bot.answerCallbackQuery(query.id);
    const custom = await getReminderPresetsByUser(userId).catch(() => []);
    let text = "⚙️ **Presets thời gian**\n\nMặc định: 15m, 30m, 1h, 3h, Tối nay 20h, Sáng mai 8h.\n\n";
    if (custom.length) {
      text += "**Của bạn:**\n";
      custom.forEach((p) => {
        text += `• ${p.label}\n`;
      });
    } else {
      text += "Bạn chưa thêm preset riêng. Bấm **➕ Thêm preset** để tạo.";
    }
    const rows = [[{ text: "➕ Thêm preset", callback_data: "reminder_preset_add" }]];
    if (custom.length) {
      rows.push(
        custom.map((p) => ({
          text: `🗑 ${p.label.slice(0, 15)}`,
          callback_data: `reminder_preset_del_${p.id}`,
        }))
      );
    }
    rows.push([{ text: "◀️ Quay lại", callback_data: "reminder_back" }]);
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: rows },
    });
    return;
  }

  if (data === "reminder_back") {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, "⏰ **Nhắc việc**\n\nChọn nút bên dưới.", {
      parse_mode: "Markdown",
      ...getMainKeyboard(),
    });
    return;
  }

  if (data === "reminder_preset_add") {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, "Chọn **loại** preset:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⏱ Sau N phút", callback_data: "reminder_preset_type_minutes" },
            { text: "📅 Hôm nay H:MM", callback_data: "reminder_preset_type_today" },
            { text: "📅 Ngày mai H:MM", callback_data: "reminder_preset_type_tomorrow" },
          ],
          [{ text: "❌ Hủy", callback_data: "reminder_presets" }],
        ],
      },
    });
    return;
  }

  if (data.startsWith("reminder_preset_type_")) {
    const type = data.replace("reminder_preset_type_", "");
    await bot.answerCallbackQuery(query.id);
    if (type === "minutes") {
      pendingState.set(userId, { step: "preset_add_minutes", chatId });
      await bot.sendMessage(chatId, "Gửi **số phút** (vd: 45):", { parse_mode: "Markdown" });
    } else if (type === "today" || type === "tomorrow") {
      pendingState.set(userId, { step: "preset_add_time", chatId, presetType: type });
      await bot.sendMessage(chatId, "Gửi **giờ** (vd: 14:30 hoặc 9:00):", { parse_mode: "Markdown" });
    }
    return;
  }

  if (data.startsWith("reminder_preset_del_")) {
    const id = data.replace("reminder_preset_del_", "");
    try {
      await deleteReminderPreset(id, userId);
      await bot.answerCallbackQuery(query.id, { text: "Đã xóa preset" });
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: query.message.message_id }
      );
      await bot.sendMessage(chatId, "✅ Đã xóa preset. Bấm /reminder → ⚙️ Presets để xem lại.");
    } catch (e) {
      await bot.answerCallbackQuery(query.id, { text: "Không xóa được" });
    }
    return;
  }
}

async function handleMessage(bot, msg) {
  const userId = msg.from?.id;
  const text = (msg.text || "").trim();
  if (!userId || !text) return false;

  const state = pendingState.get(userId);

  if (state?.step === "preset_add_minutes") {
    const mins = parseInt(text, 10);
    if (Number.isNaN(mins) || mins < 1 || mins > 60 * 24) {
      await bot.sendMessage(msg.chat.id, "❌ Gửi số phút từ 1 đến 1440 (24h).");
      return true;
    }
    const key = `custom_m${mins}_${Date.now().toString(36).slice(-6)}`;
    const label = mins < 60 ? `${mins} phút` : `${Math.floor(mins / 60)} tiếng`;
    try {
      await saveReminderPreset(userId, { key, label, type: "minutes", value: mins });
      pendingState.delete(userId);
      await bot.sendMessage(msg.chat.id, `✅ Đã thêm preset: **${label}**`, { parse_mode: "Markdown" });
    } catch (e) {
      await bot.sendMessage(msg.chat.id, "❌ Lỗi: " + e.message);
    }
    return true;
  }

  if (state?.step === "preset_add_time") {
    const match = text.match(/^(\d{1,2}):(\d{2})$/) || text.match(/^(\d{1,2})$/);
    const hour = match ? parseInt(match[1], 10) : null;
    const minute = match && match[2] != null ? parseInt(match[2], 10) : 0;
    if (hour == null || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      await bot.sendMessage(msg.chat.id, "❌ Gửi giờ đúng dạng (vd: 14:30 hoặc 9).");
      return true;
    }
    const type = state.presetType || "today";
    const key = `custom_${type}_${hour}_${minute}_${Date.now().toString(36).slice(-6)}`;
    const label =
      type === "today"
        ? `Hôm nay ${hour}:${String(minute).padStart(2, "0")}`
        : `Ngày mai ${hour}:${String(minute).padStart(2, "0")}`;
    try {
      await saveReminderPreset(userId, {
        key,
        label,
        type,
        hour,
        minute,
      });
      pendingState.delete(userId);
      await bot.sendMessage(msg.chat.id, `✅ Đã thêm preset: **${label}**`, { parse_mode: "Markdown" });
    } catch (e) {
      await bot.sendMessage(msg.chat.id, "❌ Lỗi: " + e.message);
    }
    return true;
  }

  if (!state || state.step !== "awaiting_text") return false;

  pendingState.set(userId, {
    ...state,
    step: "awaiting_time",
    text: text.slice(0, REMINDER_OPTIONS.maxTextLength),
  });

  const keyboard = await getTimeKeyboard(userId);
  await bot.sendMessage(
    msg.chat.id,
    `⏱ Chọn thời gian nhắc cho: _${text.slice(0, 100)}_`,
    { parse_mode: "Markdown", ...keyboard }
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
