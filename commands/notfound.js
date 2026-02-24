const config = {
  name: "notfound",
  description: "Hiển thị thông báo khi lệnh không tồn tại",
  hide: true,
};

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const commands = ctx?.commands || {};

  const commandNames = Object.keys(commands).sort();
  
  let text = "❓ Lệnh không tồn tại\n\n";
  text += "📋 Danh sách lệnh có sẵn:\n\n";
  
  const byCategory = {};
  for (const cmdName of commandNames) {
    const cmd = commands[cmdName];
    if (cmd.config?.hide) continue;
    const cat = cmd.config?.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(cmd);
  }

  const order = ["general", "admin", "other"];
  for (const cat of order) {
    if (!byCategory[cat]?.length) continue;
    const label = cat === "admin" ? "🔐 Admin" : cat === "general" ? "📋 Chung" : "📁 Khác";
    text += `${label}\n`;
    for (const cmd of byCategory[cat]) {
      text += `  /${cmd.config.name} - ${cmd.config.description}\n`;
    }
    text += "\n";
  }

  text += "\n💡 Gõ /help để xem hướng dẫn chi tiết.";

  bot.sendMessage(chatId, text.trim());
}

module.exports = { config, execute };
