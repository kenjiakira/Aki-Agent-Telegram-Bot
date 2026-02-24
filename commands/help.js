const config = {
  name: "help",
  description: "Hướng dẫn sử dụng bot",
  useBy: 0,
  category: "general",
};

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const commands = ctx?.commands || {};

  const byCategory = {};
  for (const cmd of Object.values(commands)) {
    const cat = cmd.config?.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(cmd);
  }

  let text = "📖 Hướng dẫn sử dụng\n\n";
  text += "Bot tự động đăng tin AI news lên channel mỗi ngày lúc 8:00.\n\n";
  text += "📌 Lệnh:\n\n";

  const order = ["general", "admin", "other"];
  for (const cat of order) {
    if (!byCategory[cat]?.length) continue;
    const label = cat === "admin" ? "🔐 Admin" : cat === "general" ? "📋 Chung" : "📁 Khác";
    text += `${label}\n`;
    for (const cmd of byCategory[cat]) {
      text += `/${cmd.config.name} - ${cmd.config.description}\n`;
    }
    text += "\n";
  }

  bot.sendMessage(chatId, text.trim());
}

module.exports = { config, execute };
