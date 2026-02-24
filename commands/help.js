const config = {
  name: "help",
  description: "Hướng dẫn sử dụng bot",
  useBy: 0,
  category: "general",
  callbacks: ["help", "help_ok", "help_section_"],
};

function getFullHelpText(commands) {
  const byCategory = {};
  for (const cmd of Object.values(commands || {})) {
    if (cmd.config?.hide) continue;
    const cat = cmd.config?.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(cmd);
  }

  let text = "📖 Chi tiết lệnh\n\n";
  const order = ["general", "admin", "other"];
  for (const cat of order) {
    if (!byCategory[cat]?.length) continue;
    const label = cat === "admin" ? "🔐 Admin" : cat === "general" ? "📋 Chung" : "📁 Khác";
    text += `${label}\n`;
    for (const cmd of byCategory[cat]) {
      let cmdLine = `/${cmd.config.name}`;
      if (cmd.config.aliases?.length) {
        cmdLine += ` (${cmd.config.aliases.map((a) => `/${a}`).join(", ")})`;
      }
      cmdLine += ` - ${cmd.config.description}`;
      text += `${cmdLine}\n`;
    }
    text += "\n";
  }
  return text.trim();
}

function getHelpInlineKeyboard(commands, isAdminUser) {
  const rows = [
    [
      { text: "📜 Lịch sử", callback_data: "help_section_history" },
      { text: "📅 Lịch", callback_data: "help_section_schedule" },
      { text: "📖 Chi tiết lệnh", callback_data: "help_section_commands" },
    ],
  ];
  if (isAdminUser) {
    rows.push([
      { text: "📊 Thống kê", callback_data: "help_section_stats" },
      { text: "🔐 Admin", callback_data: "help_section_admin" },
    ]);
  }
  return { reply_markup: { inline_keyboard: rows } };
}

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const commands = ctx?.commands || {};
  const isAdminUser = !!ctx?.isAdmin;

  const shortText =
    "📖 Hướng dẫn\n\n" +
    "Bot tự động đăng tin AI news lên channel mỗi ngày lúc 8:00.\n\n" +
    "Chọn nút bên dưới để xem nhanh từng phần:";

  const keyboard = getHelpInlineKeyboard(commands, isAdminUser);
  bot.sendMessage(chatId, shortText, keyboard);
}

/** Nội dung từng section (dùng khi bấm nút inline từ /help) */
function getSectionMessage(section, commands) {
  const messages = {
    history:
      "📜 Lịch sử\n\n" +
      "/history — Xem lịch sử lệnh đã chạy hoặc tin đã post.\n" +
      "• /history — mặc định: lịch sử commands\n" +
      "• /history --type=news — lịch sử tin đã post\n" +
      "• /history --limit=20 — số dòng (mặc định 10)",
    schedule:
      "📅 Lịch\n\n" +
      "/schedule — Lên lịch chạy command tự động (chỉ admin).\n" +
      "• /schedule list — xem lịch hiện tại\n" +
      "• /schedule add daily 08:00 /post — hằng ngày lúc 8:00 chạy /post\n" +
      "• /schedule add weekly 09:00 0 /post — Chủ nhật 9:00\n" +
      "• /schedule remove <id> — xóa lịch",
    commands: getFullHelpText(commands),
    stats:
      "📊 Thống kê\n\n" +
      "/stats — Xem thống kê số lượng tin đã post (chỉ admin).",
    admin:
      "🔐 Admin\n\n" +
      "Lệnh chỉ dành cho admin:\n" +
      "/schedule — lên lịch\n" +
      "/post — gửi tin ngay\n" +
      "/stats — thống kê\n" +
      "/admins — danh sách admin\n" +
      "/status — trạng thái bot & DB\n" +
      "/cleanup [ngày] — xóa tin cũ (mặc định 30 ngày)",
  };
  return messages[section] || null;
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const commands = ctx?.commands || {};

  await bot.answerCallbackQuery(query.id, data === "help_ok" ? { text: "👍" } : {});

  if (data === "help") {
    const fakeMsg = { chat: { id: chatId }, from: query.from };
    execute(bot, fakeMsg, ctx);
    return;
  }
  if (data === "help_ok") return;

  if (data.startsWith("help_section_")) {
    const section = data.replace("help_section_", "");
    const text = getSectionMessage(section, commands);
    if (text) await bot.sendMessage(chatId, text);
  }
}

module.exports = {
  config,
  execute,
  handleCallback,
  getFullHelpText,
  getHelpInlineKeyboard,
};
