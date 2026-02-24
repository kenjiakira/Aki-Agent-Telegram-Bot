const { postNews } = require("../utils/rss");

const config = {
  name: "post",
  description: "Gửi tin AI news lên channel ngay lập tức",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const force = text.includes("force") || text.includes("/post force");

  const statusMsg = await bot.sendMessage(
    chatId,
    force ? "⏳ Đang lấy tin và gửi lên channel (force mode)..." : "⏳ Đang lấy tin và gửi lên channel..."
  );

  try {
    await postNews(bot, force);
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
