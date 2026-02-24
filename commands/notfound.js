const { helpKeyboard } = require("../utils/keyboards");

const config = {
  name: "notfound",
  description: "Hiển thị thông báo khi lệnh không tồn tại",
  hide: true,
  callbacks: ["notfound_suggest_"],
};

function levenshtein(a, b) {
  const an = a.length;
  const bn = b.length;
  const matrix = Array(bn + 1)
    .fill(null)
    .map(() => Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

function getTypedCommandName(text) {
  const match = (text || "").trim().match(/^\/(\w+)/);
  return match ? match[1].toLowerCase() : "";
}

function canUseCommand(cmd, ctx) {
  const useBy = cmd.config?.useBy ?? 0;
  if (useBy === 0) return true;
  if (useBy === 1) return !!ctx?.isAdmin;
  return false;
}

function getSuggestions(typed, commands, ctx) {
  const names = Object.entries(commands)
    .filter(([, cmd]) => !cmd.config?.hide && canUseCommand(cmd, ctx))
    .map(([name]) => name);

  if (names.length === 0 || !typed) return [];

  const withScore = names.map((name) => ({
    name,
    distance: levenshtein(typed, name),
  }));
  withScore.sort((a, b) => a.distance - b.distance);

  const maxSuggest = 4;
  const threshold = Math.max(typed.length, 3) + 2;
  return withScore
    .filter((x) => x.distance <= threshold)
    .slice(0, maxSuggest)
    .map((x) => x.name);
}

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const commands = ctx?.commands || {};
  const typed = getTypedCommandName(msg.text || "");
  const suggestions = getSuggestions(typed, commands, ctx);

  let text = "❓ Lệnh không tồn tại.";
  if (suggestions.length > 0) {
    text += "\n\n💡 Có thể bạn muốn:\n" + suggestions.map((n) => `• /${n}`).join("\n");
  } else {
    text += "\n\n💡 Bấm nút bên dưới để xem hướng dẫn.";
  }

  const rows = [];
  if (suggestions.length > 0) {
    rows.push(
      suggestions.map((name) => ({
        text: `/${name}`,
        callback_data: `notfound_suggest_${name}`,
      }))
    );
  }
  rows.push([{ text: "📖 Help", callback_data: "help" }]);

  const reply_markup = { reply_markup: { inline_keyboard: rows } };
  bot.sendMessage(chatId, text, reply_markup);
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const userId = query.from?.id;
  const data = query.data;

  if (!data.startsWith("notfound_suggest_")) return;

  const commandName = data.replace("notfound_suggest_", "");
  const commands = ctx?.commands || {};
  const cmd = commands[commandName];

  await bot.answerCallbackQuery(query.id);

  if (!cmd) {
    await bot.sendMessage(chatId, `❌ Lệnh /${commandName} không tồn tại.`);
    return;
  }
  if (!canUseCommand(cmd, ctx)) {
    await bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
    return;
  }

  const fakeMsg = { chat: { id: chatId }, from: query.from };
  const parsed = { name: commandName, args: [], flags: {}, raw: `/${commandName}` };
  const ctxRun = { ...ctx, parsed };
  await cmd.execute(bot, fakeMsg, ctxRun);
}

module.exports = { config, execute, handleCallback };
