const { getPostedNews, getCommandHistory } = require("../utils/database");
const { getFlag } = require("../utils/commandParser");
const { formatVN } = require("../utils/time");
const { formatError } = require("../utils/errorMessages");

const config = {
  name: "history",
  description: "Xem lịch sử commands đã chạy hoặc tin đã post",
  useBy: 0,
  category: "general",
  callbacks: ["history_news", "history_commands"],
  usage:
    "• /history — mặc định: lịch sử commands\n" +
    "• /history --type=news — lịch sử tin đã post\n" +
    "• /history --limit=20 — số dòng (mặc định 10)",
};

const MAX_EDIT_LEN = 4000;

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const parsed = ctx?.parsed;
  
  const type = getFlag(parsed, "type", "commands"); // 'commands' or 'news'
  const limit = parseInt(getFlag(parsed, "limit", "10")) || 10;

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang xử lý...");

  try {
    if (type === "news") {
      const posts = await getPostedNews(limit);

      if (posts.length === 0) {
        await bot.editMessageText("📭 Chưa có tin nào được post.", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        return;
      }

      let text = `📜 Lịch sử tin đã post (${posts.length} tin gần nhất)\n\n`;

      posts.forEach((post, index) => {
        const date = formatVN(post.posted_at);
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
      const toSend = text.trim();
      if (toSend.length <= MAX_EDIT_LEN) {
        await bot.editMessageText(toSend, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          ...replyMarkupNews,
        });
      } else {
        await bot.editMessageText(toSend.substring(0, MAX_EDIT_LEN - 50) + "\n\n... (đã cắt bớt)", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          ...replyMarkupNews,
        });
      }
    } else {
      const commands = await getCommandHistory(userId, limit);

      if (commands.length === 0) {
        await bot.editMessageText("📭 Chưa có lệnh nào được chạy.", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        return;
      }

      let text = `📜 Lịch sử commands (${commands.length} lệnh gần nhất)\n\n`;

      commands.forEach((cmd, index) => {
        const date = formatVN(cmd.executed_at);
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
      const toSend = text.trim();
      if (toSend.length <= MAX_EDIT_LEN) {
        await bot.editMessageText(toSend, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          ...replyMarkup,
        });
      } else {
        await bot.editMessageText(toSend.substring(0, MAX_EDIT_LEN - 50) + "\n\n... (đã cắt bớt)", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          ...replyMarkup,
        });
      }
    }
  } catch (err) {
    await bot.editMessageText(formatError(err, "database"), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
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
