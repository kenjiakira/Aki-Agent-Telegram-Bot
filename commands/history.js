const { getPostedNews, getCommandHistory } = require("../utils/database");
const { getFlag } = require("../utils/commandParser");

const config = {
  name: "history",
  description: "Xem lịch sử commands đã chạy hoặc tin đã post",
  useBy: 0,
  category: "general",
  callbacks: ["history_news", "history_commands"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const parsed = ctx?.parsed;
  
  const type = getFlag(parsed, "type", "commands"); // 'commands' or 'news'
  const limit = parseInt(getFlag(parsed, "limit", "10")) || 10;

  try {
    if (type === "news") {
      // Show news history
      const posts = await getPostedNews(limit);

      if (posts.length === 0) {
        await bot.sendMessage(chatId, "📭 Chưa có tin nào được post.");
        return;
      }

      let text = `📜 Lịch sử tin đã post (${posts.length} tin gần nhất)\n\n`;

      posts.forEach((post, index) => {
        const date = new Date(post.posted_at).toLocaleString("vi-VN");
        const preview = post.content_preview.replace(/\n/g, " ").substring(0, 100);
        const urlCount = post.urls?.length || 0;
        text += `${index + 1}. ${date}\n`;
        text += `   ${preview}...\n`;
        if (urlCount > 0) {
          text += `   🔗 ${urlCount} URL(s)\n`;
        }
        text += `\n`;
      });

      text += `\n💡 Bấm nút bên dưới để xem lịch sử lệnh đã chạy.`;
      const replyMarkupNews = {
        reply_markup: {
          inline_keyboard: [[{ text: "📜 Lịch sử lệnh", callback_data: "history_commands" }]],
        },
      };
      await bot.sendMessage(chatId, text.trim(), replyMarkupNews);
    } else {
      // Show command history (default)
      const commands = await getCommandHistory(userId, limit);

      if (commands.length === 0) {
        await bot.sendMessage(chatId, "📭 Chưa có lệnh nào được chạy.");
        return;
      }

      let text = `📜 Lịch sử commands (${commands.length} lệnh gần nhất)\n\n`;

      commands.forEach((cmd, index) => {
        const date = new Date(cmd.executed_at).toLocaleString("vi-VN");
        const status = cmd.success ? "✅" : "❌";
        text += `${index + 1}. ${status} /${cmd.command_name}\n`;
        text += `   ⏰ ${date}\n`;
        if (cmd.command_text && cmd.command_text !== `/${cmd.command_name}`) {
          const cmdText = cmd.command_text.length > 50 
            ? cmd.command_text.substring(0, 50) + "..." 
            : cmd.command_text;
          text += `   📝 ${cmdText}\n`;
        }
        if (!cmd.success && cmd.error_message) {
          text += `   ⚠️ ${cmd.error_message.substring(0, 50)}...\n`;
        }
        text += `\n`;
      });

      text += `\n💡 Bấm nút bên dưới để xem lịch sử tin đã post.`;

      const replyMarkup = {
        reply_markup: {
          inline_keyboard: [[{ text: "📰 Lịch sử tin đã post", callback_data: "history_news" }]],
        },
      };
      await bot.sendMessage(chatId, text.trim(), replyMarkup);
    }
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  const parsed = {
    name: "history",
    args: [],
    flags: { type: data === "history_news" ? "news" : "commands" },
    raw: "",
  };
  const fakeMsg = { chat: { id: chatId }, from: query.from };
  const ctxWithParsed = { ...ctx, parsed };
  await execute(bot, fakeMsg, ctxWithParsed);
}

module.exports = { config, execute, handleCallback };
