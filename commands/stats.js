const { getPostedNews, supabase } = require("../utils/database");

const config = {
  name: "stats",
  description: "Xem thống kê số lượng tin đã post",
  useBy: 1,
  category: "admin",
  aliases: ["tk"],
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const { count, error: countError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: weekCount, error: weekError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true })
      .gte("posted_at", sevenDaysAgo.toISOString());

    if (weekError) {
      throw weekError;
    }

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const { count: dayCount, error: dayError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true })
      .gte("posted_at", oneDayAgo.toISOString());

    if (dayError) {
      throw dayError;
    }

    const recentPosts = await getPostedNews(1);
    const lastPostDate = recentPosts.length > 0 
      ? new Date(recentPosts[0].posted_at).toLocaleString("vi-VN")
      : "Chưa có";

    let text = "📊 Thống kê tin đã post\n\n";
    text += `📈 Tổng số tin: ${count || 0}\n`;
    text += `📅 7 ngày qua: ${weekCount || 0}\n`;
    text += `⏰ 24 giờ qua: ${dayCount || 0}\n`;
    text += `🕐 Tin gần nhất: ${lastPostDate}\n`;

    await bot.sendMessage(chatId, text.trim());
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute };
