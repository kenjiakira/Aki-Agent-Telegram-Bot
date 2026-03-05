const { getPostedNews, supabase } = require("../utils/database");
const { formatVN, hoursAgoVN, daysAgoVN } = require("../utils/time");
const { formatError } = require("../utils/errorMessages");

const config = {
  name: "stats",
  description: "Xem thống kê số lượng tin đã post",
  useBy: 1,
  category: "admin",
  aliases: ["tk"],
};

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang xử lý...");

  try {
    const { count, error: countError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    const sevenDaysAgo = daysAgoVN(7);
    const { count: weekCount, error: weekError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true })
      .gte("posted_at", sevenDaysAgo);

    if (weekError) {
      throw weekError;
    }

    const oneDayAgo = hoursAgoVN(24);
    const { count: dayCount, error: dayError } = await supabase
      .from("posted_news")
      .select("*", { count: "exact", head: true })
      .gte("posted_at", oneDayAgo);

    if (dayError) {
      throw dayError;
    }

    const recentPosts = await getPostedNews(1);
    const lastPostDate = recentPosts.length > 0 
      ? formatVN(recentPosts[0].posted_at)
      : "Chưa có";

    let text = "📊 Thống kê tin đã post\n\n";
    text += `📈 Tổng số tin: ${count || 0}\n`;
    text += `📅 7 ngày qua: ${weekCount || 0}\n`;
    text += `⏰ 24 giờ qua: ${dayCount || 0}\n`;
    text += `🕐 Tin gần nhất: ${lastPostDate}\n`;

    await bot.editMessageText(text.trim(), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } catch (err) {
    await bot.editMessageText(formatError(err, "database"), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = { config, execute };
