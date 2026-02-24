const { isAdmin } = require("../utils/listen");

const config = {
  name: "admins",
  description: "Xem danh sách admin hiện tại",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const adminIds = process.env.ADMIN_USER_IDS
      ? process.env.ADMIN_USER_IDS.split(",").map((id) => id.trim())
      : [];

    if (adminIds.length === 0) {
      await bot.sendMessage(chatId, "⚠️ Chưa có admin nào được cấu hình.");
      return;
    }

    let text = "👥 Danh sách Admin\n\n";
    adminIds.forEach((id, index) => {
      text += `${index + 1}. User ID: ${id}\n`;
    });

    text += `\n📊 Tổng cộng: ${adminIds.length} admin(s)`;

    await bot.sendMessage(chatId, text.trim());
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute };
