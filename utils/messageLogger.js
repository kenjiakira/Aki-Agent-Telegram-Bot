const { createLogger, COLORS } = require("./logger");

const log = createLogger("Msg");
const MAX_TEXT_LEN = 120;
const SEPARATOR = "──────────────────────";

function formatTime(msg) {
  const date = msg.date ? new Date(msg.date * 1000) : new Date();
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const d = date.toISOString().slice(0, 10);
  return `${d} ${h}:${m}:${s}`;
}

function getBoxName(chat) {
  if (!chat) return "—";
  if (chat.title) return chat.title;
  if (chat.type === "private" && (chat.first_name || chat.last_name)) {
    return [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim() || "Private";
  }
  return chat.type === "private" ? "Private" : "—";
}

function getUserName(from) {
  if (!from) return "—";
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  if (name) return from.username ? `${name} (@${from.username})` : name;
  return from.username ? `@${from.username}` : "—";
}

function logMessage(msg) {
  if (!msg) return;
  const chatId = msg.chat?.id ?? "—";
  const boxName = getBoxName(msg.chat);
  const userId = msg.from?.id ?? "—";
  const userName = getUserName(msg.from);
  const text = (msg.text || "(không có text)").trim();
  const preview = text.length > MAX_TEXT_LEN ? text.slice(0, MAX_TEXT_LEN) + "…" : text;
  const timeStr = formatTime(msg);

  const lines = [
    COLORS.dim + SEPARATOR + COLORS.reset,
    COLORS.dim + "box:" + COLORS.reset + "  " + chatId + "  " + COLORS.cyan + boxName + COLORS.reset,
    COLORS.dim + "user:" + COLORS.reset + " " + userId + "  " + COLORS.green + userName + COLORS.reset,
    COLORS.dim + "text:" + COLORS.reset + "  " + (preview || "—"),
    COLORS.dim + "time:" + COLORS.reset + "  " + timeStr,
  ];
  log.log(lines.join("\n    "));
}

module.exports = { logMessage };
