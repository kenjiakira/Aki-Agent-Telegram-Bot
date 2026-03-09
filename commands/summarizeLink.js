const { getModel, createResponse } = require("../lib/openai");
const { LINK_SUMMARY } = require("../utils/prompts");
const { runValidateUrl } = require("../hooks/summarizeLinkHooks");

function extractFirstUrl(text) {
  const match = (text || "").match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0].trim() : null;
}

const config = {
  name: "summarizelink",
  description: "Tóm tắt link (agent ẩn)",
  useBy: 0,
  category: "other",
  hide: true,
};

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Gửi một link (URL) trong tin nhắn để nhận tóm tắt 5 dòng.");
}

async function handleMessage(bot, msg) {
  const text = (msg.text || "").trim();
  const url = extractFirstUrl(text);
  if (!url) return false;

  const validation = runValidateUrl(url);
  if (!validation.valid) {
    if (validation.reason) await bot.sendMessage(msg.chat.id, "⚠️ " + validation.reason);
    return !!validation.reason;
  }

  const chatId = msg.chat.id;
  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang tóm tắt...");

  try {
    const query = LINK_SUMMARY.queryFormat + url;
    const summary = await createResponse({
      model: getModel(),
      instructions: LINK_SUMMARY.instructions,
      input: [{ role: "user", content: query }],
      tools: [{ type: "web_search" }],
    });
    if (!summary) {
      await bot.editMessageText("Không tóm tắt được nội dung link.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return true;
    }

    await bot.editMessageText("📄 **Tóm tắt (5 dòng):**\n\n" + summary, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    const errText = err?.message || "Lỗi khi tóm tắt link.";
    await bot.editMessageText("❌ " + errText, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    }).catch(() => bot.sendMessage(chatId, "❌ " + errText));
  }

  return true;
}

module.exports = {
  config,
  execute,
  handleMessage,
};
