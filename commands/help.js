const config = {
  name: "help",
  description: "Hướng dẫn sử dụng bot",
  useBy: 0,
  category: "general",
  callbacks: ["help", "help_ok", "help_section_"],
};

function formatCommandLine(cmd) {
  if (!cmd?.config?.name) return "";
  let line = `/${cmd.config.name}`;
  line += ` — ${cmd.config.description}`;
  return line;
}

function getFullHelpText(commands, isAdminUser) {
  const byCategory = {};
  for (const cmd of Object.values(commands || {})) {
    if (cmd.config?.hide) continue;
    if (!isAdminUser && (cmd.config?.category || "other") === "admin") continue;
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
      text += formatCommandLine(cmd) + "\n";
    }
    text += "\n";
  }
  return text.trim();
}

function getCategoryHelpText(commands, category) {
  const list = [];
  for (const cmd of Object.values(commands || {})) {
    if (cmd.config?.hide) continue;
    if ((cmd.config?.category || "other") !== category) continue;
    list.push(formatCommandLine(cmd));
  }
  return list.join("\n");
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
    "Bắt đầu: Gõ /start để xem từng bước và đăng ký nhận tin tự động mỗi ngày 8:00 (vào tin nhắn riêng).\n\n" +
    "Chọn nút bên dưới để xem nhanh từng phần:";

  const keyboard = getHelpInlineKeyboard(commands, isAdminUser);
  bot.sendMessage(chatId, shortText, keyboard);
}

const SECTION_META = {
  history: { title: "📜 Lịch sử", commandName: "history" },
  schedule: { title: "📅 Lịch", commandName: "schedule" },
  stats: { title: "📊 Thống kê", commandName: "stats" },
  commands: { title: null, commandName: null },
  admin: { title: "🔐 Admin", commandName: null },
};

function getSectionMessage(section, commands, isAdminUser) {
  const meta = SECTION_META[section];
  if (!meta) return null;
  if (section === "admin" && !isAdminUser) return null;

  if (section === "commands") return getFullHelpText(commands, isAdminUser);

  if (meta.commandName) {
    const cmd = commands?.[meta.commandName];
    if (!cmd?.config) return null;
    let text = `${meta.title}\n\n${formatCommandLine(cmd)}`;
    if (cmd.config.usage) text += "\n\n" + cmd.config.usage;
    return text;
  }

  if (section === "admin") {
    const body = getCategoryHelpText(commands, "admin");
    return body ? `${meta.title}\n\nLệnh chỉ dành cho admin:\n${body}` : null;
  }

  return null;
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
    const isAdminUser = !!ctx?.isAdmin;
    const text = getSectionMessage(section, commands, isAdminUser);
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
