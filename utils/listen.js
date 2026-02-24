const { loadCommands } = require("./commands");
const { parseCommand } = require("./commandParser");
const { saveCommandHistory } = require("./database");

const ALLOWED_IDS = process.env.ALLOWED_USER_IDS
  ? process.env.ALLOWED_USER_IDS.split(",").map((id) => id.trim())
  : [];

const ADMIN_IDS = process.env.ADMIN_USER_IDS
  ? process.env.ADMIN_USER_IDS.split(",").map((id) => id.trim())
  : [];

function hasPermission(userId) {
  if (ALLOWED_IDS.length === 0) return true;
  return ALLOWED_IDS.includes(String(userId));
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(String(userId));
}

function canUseCommand(cmd, userId) {
  const useBy = cmd.config?.useBy ?? 0;
  if (useBy === 0) return true;
  if (useBy === 1) return isAdmin(userId);
  return false;
}

function findCallbackHandler(commands, data) {
  if (!data) return null;
  for (const cmd of Object.values(commands)) {
    const callbacks = cmd.config?.callbacks;
    if (!callbacks || !Array.isArray(callbacks) || typeof cmd.handleCallback !== "function")
      continue;
    const match = callbacks.some((c) =>
      c.endsWith("_") ? data.startsWith(c) : data === c
    );
    if (match) return cmd;
  }
  return null;
}

function setupListen(bot) {
  const { commands, aliases } = loadCommands();

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = (msg.text || "").trim();

    if (!hasPermission(userId)) {
      bot.sendMessage(chatId, "⛔ Bạn không có quyền sử dụng bot.");
      return;
    }

    const match = text.match(/^\/(\w+)/);
    const cmdName = match ? match[1].toLowerCase() : null;

    if (cmdName) {
      const actualCmdName = aliases[cmdName] || cmdName;
      const cmd = commands[actualCmdName];
      
      if (cmd) {
        if (!canUseCommand(cmd, userId)) {
          bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
          return;
        }
        
        const parsed = parseCommand(text);
        const ctx = { 
          commands, 
          parsed,
          aliases,
          isAdmin: isAdmin(userId),
        };
        
        try {
          await cmd.execute(bot, msg, ctx);
          await saveCommandHistory(userId, actualCmdName, text, true);
        } catch (err) {
          await saveCommandHistory(userId, actualCmdName, text, false, err.message);
          throw err;
        }
      } else {
        const notfoundCmd = commands["notfound"];
        if (notfoundCmd) {
          const ctx = { commands, parsed: parseCommand(text), aliases, isAdmin: isAdmin(userId) };
          notfoundCmd.execute(bot, msg, ctx);
        } else {
          bot.sendMessage(chatId, `❓ Lệnh /${cmdName} không tồn tại. Gõ /help để xem danh sách lệnh.`);
        }
      }
      return;
    }
  });

  bot.on("callback_query", async (query) => {
    const userId = query.from?.id;
    const data = query.data;

    if (!hasPermission(userId)) {
      await bot.answerCallbackQuery(query.id, { text: "⛔ Bạn không có quyền." });
      return;
    }

    const ctx = { commands, parsed: {}, aliases, isAdmin: isAdmin(userId) };
    const handler = findCallbackHandler(commands, data);
    if (handler) {
      await handler.handleCallback(bot, query, ctx);
    }
  });
}

module.exports = { setupListen, hasPermission, isAdmin, loadCommands };
