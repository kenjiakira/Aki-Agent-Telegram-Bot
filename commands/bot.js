const { getModel, createResponse } = require("../lib/llm");
const { getPhotoUrl } = require("../utils/listen");
const { getDisplayName } = require("../lib/username");

const TRIGGER_WORDS = [
  "bot",
  "bluenest",
];

const BLUENEST_SYSTEM_PROMPT = `Bạn là BlueNest, một trợ lý AI thân thiện và hữu ích. 
Trả lời bằng tiếng Việt một cách tự nhiên, ngắn gọn và dễ hiểu. 
Bạn có thể giúp người dùng với nhiều việc: trả lời câu hỏi, giải thích khái niệm, hỗ trợ công việc, hoặc chỉ đơn giản là trò chuyện.
Luôn lịch sự, nhiệt tình và sẵn sàng giúp đỡ.`;

const DEFAULT_REPLY =
  "👋 Có tôi đây! Cần tôi giúp gì? Gõ /help để xem lệnh.";

const threadContexts = new Map();

const config = {
  name: "bot",
  description: "ChatBot AI",
  useBy: 0,
  category: "other",
  hide: true,
  usePrefix: false,
  aliases: ["bluenest", "ai"],
};

function hasTriggerWord(text) {
  if (!text || typeof text !== "string") return false;
  const lower = text.trim().toLowerCase();
  return TRIGGER_WORDS.some((word) => lower.includes(word));
}

async function getAIResponse(userMessageOrThread, thread = null, userName = null) {
  try {
    let instructions = BLUENEST_SYSTEM_PROMPT;
    if (userName) {
      instructions += `\n\nNgười dùng hiện tại tên là ${userName}. Hãy xưng hô thân thiện với ${userName} khi trả lời.`;
    }

    let input;
    
    if (thread === null && Array.isArray(userMessageOrThread)) {
      input = userMessageOrThread;
    } 
    else if (thread === null) {
      input = [{ role: "user", content: userMessageOrThread }];
    } 
    else if (!Array.isArray(userMessageOrThread)) {
      input = [
        ...thread,
        { role: "user", content: userMessageOrThread },
      ];
    }
    else {
      throw new Error("Invalid parameters: both thread and userMessageOrThread are provided, but userMessageOrThread is array");
    }

    if (!Array.isArray(input) || input.length === 0) {
      throw new Error("Invalid input: must be non-empty array");
    }

    for (const msg of input) {
      if (!msg.role || !msg.content) {
        throw new Error(`Invalid message format: missing role or content`);
      }
      if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (!item.type) {
            throw new Error(`Invalid content item: missing type in array content`);
          }
        }
      }
    }

    const answer = await createResponse({
      model: getModel(),
      instructions,
      input,
      tools: [],
    });

    return answer || "Xin lỗi, tôi không thể trả lời ngay bây giờ. Vui lòng thử lại sau.";
  } catch (err) {
    console.error("BlueNest AI error:", err.message);
    console.error("Error details:", err);
    if (err.message && err.message.includes("Invalid")) {
      console.error("Input that caused error:", JSON.stringify(userMessageOrThread, null, 2));
      console.error("Thread:", JSON.stringify(thread, null, 2));
    }
    return "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.";
  }
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (ctx?.parsed?.args || []).join(" ").trim();

  if (!text) {
    await bot.sendMessage(chatId, DEFAULT_REPLY);
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ BlueNest đang suy nghĩ...");

  try {
    const userName = getDisplayName(msg.from);
    const answer = await getAIResponse(text, null, userName);
    const reply = `\n\n${answer}`;

    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const thread = [
      { role: "user", content: text },
      { role: "assistant", content: answer },
    ];
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

async function handleMessage(bot, msg) {
  const text = (msg.text || msg.caption || "").trim();
  
  if (msg.reply_to_message && msg.reply_to_message.from?.is_bot) {
    const chatId = msg.chat.id;
    const replyToMsgId = msg.reply_to_message.message_id;
    const contextKey = `${chatId}_${replyToMsgId}`;
    const savedContext = threadContexts.get(contextKey);
    
    if (savedContext && savedContext.thread) {
      const hasPhoto = !!msg.photo && msg.photo.length > 0;
      let photoUrl = null;
      
      if (hasPhoto) {
        try {
          const photo = msg.photo[msg.photo.length - 1];
          photoUrl = await getPhotoUrl(bot, photo.file_id);
        } catch (e) {
          photoUrl = null;
        }
      }
      
      if (!text && !photoUrl) {
        await bot.sendMessage(chatId, "📝 Gửi câu hỏi tiếp theo (text hoặc ảnh) bằng cách reply tin nhắn này.");
        return true;
      }
      
      const statusMsg = await bot.sendMessage(chatId, "⏳ BlueNest đang suy nghĩ...");
      
      try {
        const userName = getDisplayName(msg.from);
        let userMessage;
        if (photoUrl) {
          const promptText = text 
            ? `Câu hỏi tiếp: ${text}` 
            : "Giải thích nội dung trong ảnh này (trong ngữ cảnh cuộc trò chuyện trước).";
          userMessage = {
            role: "user",
            content: [
              { type: "input_text", text: promptText },
              { type: "input_image", image_url: photoUrl },
            ],
          };
        } else {
          if (!text || text.trim() === "") {
            await bot.sendMessage(chatId, "📝 Gửi câu hỏi tiếp theo (text hoặc ảnh) bằng cách reply tin nhắn này.");
            return true;
          }
          userMessage = { role: "user", content: text };
        }
        
        const thread = savedContext.thread;
        const updatedThread = thread.concat([userMessage]);
        const answer = await getAIResponse(updatedThread, null, userName);
        
        const reply = `${answer}`;
        await bot.editMessageText(reply, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        
        const newThread = updatedThread.concat([{ role: "assistant", content: answer }]);
        const newContextKey = `${chatId}_${statusMsg.message_id}`;
        threadContexts.set(newContextKey, { thread: newThread });
        threadContexts.delete(contextKey);
        
        setTimeout(() => {
          threadContexts.delete(newContextKey);
        }, 60 * 60 * 1000);
        
        return true;
      } catch (err) {
        const errText = err?.message || "Lỗi khi gọi OpenAI.";
        await bot
          .editMessageText("❌ " + errText, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
          })
          .catch(() => bot.sendMessage(chatId, "❌ " + errText));
        return true;
      }
    }
  }
  
  if (!hasTriggerWord(text)) return false;

  const chatId = msg.chat.id;
  const statusMsg = await bot.sendMessage(chatId, "⏳ BlueNest đang suy nghĩ...");

  try {
    const userName = getDisplayName(msg.from);
    const answer = await getAIResponse(text, null, userName);
    const reply = `${answer}`;

    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const thread = [
      { role: "user", content: text },
      { role: "assistant", content: answer },
    ];
    
    const contextKey = `${chatId}_${statusMsg.message_id}`;
    threadContexts.set(contextKey, { thread });
    
    setTimeout(() => {
      threadContexts.delete(contextKey);
    }, 60 * 60 * 1000);
    
    return true;
  } catch (err) {
    const errText = err?.message || "Lỗi khi gọi OpenAI.";
    await bot
      .editMessageText("❌ " + errText, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      })
      .catch(() => bot.sendMessage(chatId, "❌ " + errText));
    return true;
  }
}

async function handleReply(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();
  const hasPhoto = !!ctx.photoUrl;
  const replyContext = ctx.replyContext || {};
  
  let thread = replyContext.thread || [];
  
  if (thread.length === 0 && msg.reply_to_message) {
    const contextKey = `${chatId}_${msg.reply_to_message.message_id}`;
    const savedContext = threadContexts.get(contextKey);
    if (savedContext && savedContext.thread) {
      thread = savedContext.thread;
    }
  }

  if (!thread || !Array.isArray(thread) || thread.length === 0) {
    await bot.sendMessage(chatId, "⛔ Phiên trò chuyện đã hết. Gửi tin nhắn mới để bắt đầu lại.");
    return;
  }

  if (!text && !hasPhoto) {
    await bot.sendMessage(chatId, "📝 Gửi câu hỏi tiếp theo (text hoặc ảnh) bằng cách reply tin nhắn này.");
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ BlueNest đang suy nghĩ...");

  try {
    const userName = getDisplayName(msg.from);
    let userMessage;
    if (hasPhoto && ctx.photoUrl && ctx.photoUrl.trim() !== "") {
      const promptText = (text && text.trim()) 
        ? `Câu hỏi tiếp: ${text}` 
        : "Giải thích nội dung trong ảnh này (trong ngữ cảnh cuộc trò chuyện trước).";
      userMessage = {
        role: "user",
        content: [
          { type: "input_text", text: promptText },
          { type: "input_image", image_url: ctx.photoUrl },
        ],
      };
    } else {
      if (!text || text.trim() === "") {
        await bot.sendMessage(chatId, "📝 Gửi câu hỏi tiếp theo (text hoặc ảnh) bằng cách reply tin nhắn này.");
        return;
      }
      userMessage = { role: "user", content: text.trim() };
    }

    const updatedThread = thread.concat([userMessage]);
    const answer = await getAIResponse(updatedThread, null, userName);

    const reply = `\n\n${answer}`;
    await bot.editMessageText(reply, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const newThread = updatedThread.concat([{ role: "assistant", content: answer }]);
    
    ctx.registerNextReply?.(statusMsg.message_id, { thread: newThread });
    
    const contextKey = `${chatId}_${statusMsg.message_id}`;
    threadContexts.set(contextKey, { thread: newThread });
    
    if (msg.reply_to_message) {
      const oldKey = `${chatId}_${msg.reply_to_message.message_id}`;
      threadContexts.delete(oldKey);
    }

    setTimeout(() => {
      threadContexts.delete(contextKey);
    }, 60 * 60 * 1000);
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
  handleMessage,
  handleReply,
};
