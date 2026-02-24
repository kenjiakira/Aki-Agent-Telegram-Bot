const { postNews } = require("../utils/rss");

const config = {
  name: "post",
  description: "Gửi tin AI news lên channel ngay lập tức",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;
  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang lấy tin và gửi lên channel...");

  try {
    await postNews(bot);
    await bot.editMessageText("✅ Đã gửi tin lên channel!", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } catch (err) {
    await bot.editMessageText(`❌ Lỗi: ${err.message}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = { config, execute };
