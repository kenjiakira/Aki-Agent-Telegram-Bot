const { getModel, createResponse } = require("../lib/llm");
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

    const thread = [...input, { role: "assistant", content: answer }];
    ctx.registerReplyContext?.(statusMsg.message_id, { thread });
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

async function handleReply(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();
  const hasPhoto = !!ctx.photoUrl;
  const replyContext = ctx.replyContext || {};
  const thread = replyContext.thread;

  if (!thread || !Array.isArray(thread)) {
    await bot.sendMessage(chatId, "⛔ Phiên giải bài đã hết. Gửi /solve để bắt đầu lại.");
    return;
  }

  if (!text && !hasPhoto) {
    await bot.sendMessage(chatId, "📝 Gửi câu hỏi tiếp theo (text hoặc ảnh) bằng cách reply tin nhắn này.");
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang trả lời...");

  try {
    let newUserMsg;
    if (hasPhoto) {
      const promptText = text ? "Câu hỏi tiếp: " + text : "Giải thích thêm nội dung trong ảnh này (trong ngữ cảnh bài tập trước).";
      newUserMsg = {
        role: "user",
        content: [
          { type: "input_text", text: promptText },
          { type: "input_image", image_url: ctx.photoUrl },
        ],
      };
    } else {
      newUserMsg = { role: "user", content: text };
    }

    const updatedThread = thread.concat([newUserMsg]);
    const answer = await createResponse({
      model: getModel(),
      instructions: SOLVE_EXERCISE.instructions,
      input: updatedThread,
      tools: [],
    });

    if (!answer) {
      await bot.editMessageText("Không tạo được câu trả lời.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const reply = "📚 Trả lời:\n\n" + answer;
    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const newThread = updatedThread.concat([{ role: "assistant", content: answer }]);
    ctx.registerNextReply?.(statusMsg.message_id, { thread: newThread });
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
  handleReply,
};
