const { cleanupOldNews } = require("../utils/database");

const config = {
  name: "cleanup",
  description: "Xóa tin cũ (mặc định: 30 ngày, dùng /cleanup 7 để xóa tin >7 ngày)",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  const match = text.match(/\/cleanup\s+(\d+)/);
  const daysOld = match ? parseInt(match[1]) : 30;

  if (daysOld < 1) {
    await bot.sendMessage(chatId, "❌ Số ngày phải lớn hơn 0.");
    return;
  }

  const statusMsg = await bot.sendMessage(
    chatId,
    `⏳ Đang xóa tin cũ hơn ${daysOld} ngày...`
  );

  try {
    const deletedCount = await cleanupOldNews(daysOld);
    
    await bot.editMessageText(
      `✅ Đã xóa ${deletedCount} tin cũ hơn ${daysOld} ngày.`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      }
    );
  } catch (err) {
    await bot.editMessageText(`❌ Lỗi: ${err.message}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = { config, execute };
