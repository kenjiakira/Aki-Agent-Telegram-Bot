const { supabase } = require("../utils/database");

const config = {
  name: "status",
  description: "Kiểm tra trạng thái bot và kết nối database",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  try {
    let text = "🔍 Trạng thái hệ thống\n\n";

    text += "📦 Database:\n";
    try {
      const { data, error } = await supabase
        .from("posted_news")
        .select("id")
        .limit(1);

      if (error) {
        text += `   ❌ Lỗi kết nối: ${error.message}\n`;
      } else {
        text += `   ✅ Kết nối OK\n`;
      }
    } catch (err) {
      text += `   ❌ Lỗi: ${err.message}\n`;
    }

    text += "\n⚙️ Cấu hình:\n";
    text += `   Webhook: ${process.env.USE_WEBHOOK === "true" ? "✅ Bật" : "❌ Tắt"}\n`;
    text += `   Supabase URL: ${process.env.SUPABASE_URL ? "✅ Đã cấu hình" : "❌ Chưa cấu hình"}\n`;
    text += `   Admin IDs: ${process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(",").length + " admin(s)" : "Chưa cấu hình"}\n`;
    
    text += `\n🕐 Thời gian server: ${new Date().toLocaleString("vi-VN")}\n`;

    await bot.sendMessage(chatId, text.trim());
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute };
