const { getModel, createAgentResponse } = require("../lib/llm");
const { getDisplayName } = require("../lib/username");
const { fetchWeather } = require("../lib/openweather");
const { WEATHER } = require("../utils/prompts");

const TRIGGER_WORDS = ["thời tiết", "weather", "dự báo thời tiết", "thời tiết ở"];

const WEATHER_TOOLS = [
  {
    type: "function",
    name: "get_weather",
    description: "Lấy thông tin thời tiết hiện tại và dự báo cho một địa điểm (thành phố, quốc gia).",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Tên địa điểm, ví dụ: Hanoi, Ho Chi Minh City, Paris, Tokyo",
        },
      },
      required: ["location"],
    },
  },
];

function hasTriggerWord(text) {
  if (!text || typeof text !== "string") return false;
  const lower = text.trim().toLowerCase();
  return TRIGGER_WORDS.some((word) => lower.includes(word.toLowerCase()));
}

const config = {
  name: "weather",
  description: "Tra cứu thời tiết",
  useBy: 0,
  category: "other",
  hide: true,
  usePrefix: false,
};

async function handleMessage(bot, msg) {
  const text = (msg.text || "").trim();
  if (!hasTriggerWord(text)) return false;

  const chatId = msg.chat.id;
  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang tra thời tiết...");

  try {
    await runWeatherAgent(bot, chatId, text, statusMsg, msg);
  } catch (err) {
    const errText = err?.message || "Lỗi tra thời tiết.";
    await bot
      .editMessageText("❌ " + errText, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      })
      .catch(() => bot.sendMessage(chatId, "❌ " + errText));
  }

  return true;
}

async function runWeatherAgent(bot, chatId, text, statusMsg, msg = null) {
  const userName = getDisplayName(msg?.from);
  let instructions = WEATHER.instructions;
  if (userName && userName !== "bạn") {
    instructions += `\n\nNgười dùng tên ${userName}. Trả lời thân thiện, xưng hô với ${userName}.`;
  }

  const toolHandler = async (name, args) => {
    if (name === "get_weather") {
      const loc = args?.location || "Hanoi";
      return await fetchWeather(loc);
    }
    return `Tool ${name} chưa được hỗ trợ.`;
  };

  const answer = await createAgentResponse({
    model: getModel(),
    instructions,
    input: [{ role: "user", content: text }],
    tools: WEATHER_TOOLS,
    toolHandler,
  });

  await bot.editMessageText("🌤️ " + answer, {
    chat_id: chatId,
    message_id: statusMsg.message_id,
    parse_mode: "Markdown",
  });
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (ctx?.parsed?.args || []).join(" ").trim();

  if (!text) {
    await bot.sendMessage(
      chatId,
      "Gõ tin nhắn có chứa \"thời tiết\" và địa điểm, ví dụ:\n• thời tiết Hà Nội\n• weather in Paris\n• dự báo thời tiết TP.HCM"
    );
    return;
  }

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang tra thời tiết...");

  try {
    await runWeatherAgent(bot, chatId, text, statusMsg, msg);
  } catch (err) {
    const errText = err?.message || "Lỗi tra thời tiết.";
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
};
