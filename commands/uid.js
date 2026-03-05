const config = {
  name: "uid",
  description: "Xem Telegram User ID và Chat ID",
  useBy: 0,
  category: "general",
  usePrefix: false,
};

function execute(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const chatType = msg.chat?.type || "—";

  let text = "🆔 ID\n\n";
  text += `👤 User ID: \`${userId ?? "—"}\`\n`;
  text += `💬 Chat ID: \`${chatId}\`\n`;
  text += `📂 Loại chat: ${chatType}`;

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
}

module.exports = { config, execute };
