const { postNews, fetchNews } = require("../utils/rss");
const { hasFlag, getFlag } = require("../utils/commandParser");
const { extractUrls, isAlreadyPosted } = require("../utils/database");
const { formatError } = require("../utils/errorMessages");

const config = {
  name: "post",
  description: "Gửi tin AI news lên channel ngay lập tức",
  useBy: 1,
  category: "admin",
  aliases: ["tin"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const parsed = ctx?.parsed;
  
  const force = hasFlag(parsed, "force") || hasFlag(parsed, "f");
  const preview = hasFlag(parsed, "preview") || hasFlag(parsed, "p");

  if (preview) {
    const statusMsg = await bot.sendMessage(chatId, "⏳ Đang xử lý...");

    try {
      const content = await fetchNews();
      if (!content.trim()) {
        throw new Error("Không lấy được nội dung tin");
      }

      const urls = extractUrls(content);
      const isDuplicate = await isAlreadyPosted(content);

      let previewText = "👁️ PREVIEW - Tin sẽ được post:\n\n";
      previewText += "━━━━━━━━━━━━━━━━━━━━\n\n";
      previewText += content.trim();
      previewText += "\n\n━━━━━━━━━━━━━━━━━━━━\n";
      previewText += `\n📊 Thông tin:\n`;
      previewText += `🔗 Số URL: ${urls.length}\n`;
      previewText += `⚠️ Trùng lặp: ${isDuplicate ? "Có (sẽ bỏ qua nếu không dùng --force)" : "Không"}\n`;
      
      if (isDuplicate && !force) {
        previewText += `\n💡 Dùng --force để post lại tin này.`;
      }

      const maxLen = 4000;
      if (previewText.length <= maxLen) {
        await bot.editMessageText(previewText, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "Markdown",
        });
      } else {
        await bot.editMessageText(previewText.substring(0, maxLen - 100) + "\n\n... (tin quá dài, đã cắt bớt)", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "Markdown",
        });
      }
    } catch (err) {
      await bot.editMessageText(formatError(err, "rss"), {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
    }
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang xử lý...");

  try {
    await postNews(bot, force);
    await bot.editMessageText("✅ Đã post 1 tin lên channel.", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } catch (err) {
    await bot.editMessageText(formatError(err, "rss"), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = { config, execute };
