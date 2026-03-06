const { getModel, createResponse } = require("../lib/openai");
const { SOLVE_EXERCISE } = require("../utils/prompts");

const config = {
  name: "solve",
  description: "Giải bài tập (text hoặc ảnh chụp bài)",
  useBy: 0,
  category: "other",
  aliases: ["giai", "baitap"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (ctx.parsed?.args || []).join(" ").trim();
  const hasPhoto = !!ctx.photoUrl;

  if (!text && !hasPhoto) {
    await bot.sendMessage(
      chatId,
      "📝 Gửi kèm nội dung bài tập hoặc ảnh chụp bài.\n\n• Text: /solve Giải phương trình 2x + 5 = 15\n• Ảnh: gửi ảnh kèm caption /solve hoặc /solve bài 3",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, hasPhoto ? "⏳ Đang xem ảnh và giải..." : "⏳ Đang giải...");

  try {
    let input;

    if (hasPhoto) {
      const imageUrl = ctx.photoUrl;
      const promptText = text
        ? "Giải bài tập trong ảnh. Yêu cầu thêm: " + text
        : "Giải bài tập trong ảnh: nêu từng bước, công thức (nếu có) và đáp số. Trả lời bằng tiếng Việt.";
      input = [
        {
          role: "user",
          content: [
            { type: "input_text", text: promptText },
            { type: "input_image", image_url: imageUrl },
          ],
        },
      ];
    } else {
      input = [{ role: "user", content: "Giải bài tập sau:\n\n" + text }];
    }

    const answer = await createResponse({
      model: getModel(),
      instructions: SOLVE_EXERCISE.instructions,
      input,
      tools: [],
    });

    if (!answer) {
      await bot.editMessageText("Không tạo được lời giải.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const reply = "📚 Lời giải:\n\n" + answer;
    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } catch (err) {
    const errText = err?.message || "Lỗi khi gọi OpenAI.";
    await bot
      .editMessageText("❌ " + errText, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      })
      .catch(() => bot.sendMessage(chatId, "❌ " + errText));
  }
}

module.exports = {
  config,
  execute,
};
