const { postNewsByTopic, fetchNewsByTopic } = require("../utils/rss");
const { hasFlag } = require("../utils/commandParser");
const { extractUrls, isAlreadyPosted } = require("../utils/database");
const { formatError } = require("../utils/errorMessages");
const { TOPIC_NEWS, TOPIC_IDS } = require("../utils/prompts");

const config = {
  name: "post",
  description: "Gửi tin theo chủ đề lên channel (crypto, tech, world, ai). Mặc định: ai",
  useBy: 1,
  category: "admin",
  aliases: ["tin"],
};

function getTopicId(parsed) {
  const args = (parsed?.args || []).map((a) => String(a).toLowerCase().trim());
  const name = (parsed?.name || "").toLowerCase();
  const candidate = TOPIC_IDS.includes(name) ? name : args[0];
  return TOPIC_IDS.includes(candidate) ? candidate : "ai";
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const parsed = ctx?.parsed;

  const force = hasFlag(parsed, "force") || hasFlag(parsed, "f");
  const preview = hasFlag(parsed, "preview") || hasFlag(parsed, "p");
  const topicId = getTopicId(parsed);

  if (preview) {
    const statusMsg = await bot.sendMessage(chatId, `⏳ Đang lấy tin (${TOPIC_NEWS.topics[topicId].label})...`);

    try {
      const content = await fetchNewsByTopic(topicId);
      if (!content || !content.trim()) {
        throw new Error("Không lấy được nội dung tin");
      }

      const urls = extractUrls(content);
      const isDuplicate = await isAlreadyPosted(content);
      const header = TOPIC_NEWS.topics[topicId].newsHeader;

      let previewText = "👁️ PREVIEW - Tin sẽ được post:\n\n";
      previewText += "━━━━━━━━━━━━━━━━━━━━\n\n";
      previewText += header + content.trim();
      previewText += "\n\n━━━━━━━━━━━━━━━━━━━━\n";
      previewText += `\n📊 Thông tin:\n`;
      previewText += `📂 Chủ đề: ${TOPIC_NEWS.topics[topicId].label}\n`;
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

  const statusMsg = await bot.sendMessage(chatId, `⏳ Đang xử lý (${TOPIC_NEWS.topics[topicId].label})...`);

  try {
    await postNewsByTopic(bot, topicId, force);
    await bot.editMessageText(`✅ Đã post 1 tin (${TOPIC_NEWS.topics[topicId].label}) lên channel.`, {
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
