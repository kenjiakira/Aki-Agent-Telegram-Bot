const { getPostedNews } = require("../utils/database");

const config = {
  name: "history",
  description: "Xem lịch sử tin đã post (10 tin gần nhất)",
  useBy: 1,
  category: "admin",
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const posts = await getPostedNews(10);

    if (posts.length === 0) {
      await bot.sendMessage(chatId, "📭 Chưa có tin nào được post.");
      return;
    }

    let text = "📜 Lịch sử tin đã post (10 tin gần nhất)\n\n";

    posts.forEach((post, index) => {
      const date = new Date(post.posted_at).toLocaleString("vi-VN");
      const preview = post.content_preview.replace(/\n/g, " ").substring(0, 100);
      text += `${index + 1}. ${date}\n`;
      text += `   ${preview}...\n\n`;
    });

    await bot.sendMessage(chatId, text.trim());
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute };
