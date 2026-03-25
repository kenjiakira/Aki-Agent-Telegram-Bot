
const { nowInVN } = require("../utils/time");
const { getDisplayName } = require("../lib/username");

const config = {
  name: "greet",
  description: "Greet theo buổi trong ngày",
  useBy: 0,
  category: "general",
  usage: "• /greet\n• /greet sáng|chiều|tối|khuya",
  aliases: ["greeting"],
};

function getSlotByHour(hour) {
  if (hour >= 5 && hour <= 10) return "sáng";
  if (hour >= 11 && hour <= 16) return "chiều";
  if (hour >= 17 && hour <= 21) return "tối";
  return "khuya";
}

function getGreetingText(slot) {
  switch (slot) {
    case "sáng":
      return "Chào buổi sáng";
    case "chiều":
      return "Chào buổi chiều";
    case "tối":
      return "Chào buổi tối";
    case "khuya":
      return "Chào buổi khuya";
    default:
      return "Chào bạn";
  }
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const name = getDisplayName(msg.from);

  const forced = (ctx?.parsed?.args?.[0] || "").toLowerCase();
  const vnNow = nowInVN();
  const slot = forced === "sáng" || forced === "dien" ? "sáng" : forced === "chiều" || forced === "chieu" ? "chiều"
    : forced === "tối" || forced === "toi" ? "tối"
    : forced === "khuya" ? "khuya"
    : getSlotByHour(vnNow.hours);

  const greet = getGreetingText(slot);

  bot.sendMessage(chatId, `${greet}, ${name}! Chúc bạn một ngày vui vẻ.`);
}

async function handleMessage(bot, msg) {
  const text = (msg.text || msg.caption || "").trim();
  if (!text) return false;
  if (msg.from?.is_bot) return false;

  if (text.startsWith("/")) return false;

  const normalized = text.toLowerCase();

  const greetRegex = /^(hi|hello|hey|halo|xin\s*chào|xin\s*chao|chào|chao)\b/iu;
  if (!greetRegex.test(normalized)) return false;

  await execute(bot, msg, { parsed: { args: [] } });
  return true;
}

module.exports = { config, execute, handleMessage };