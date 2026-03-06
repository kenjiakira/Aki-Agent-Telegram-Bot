const path = require("path");
const fs = require("fs");
const { loadCommands } = require("./commands");
const { parseCommand } = require("./commandParser");
const {
  saveCommandHistory,
  upsertBotUser,
  getPermission,
} = require("./database");

function getConfig() {
  try {
    const p = path.join(__dirname, "../config.json");
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getPrefix() {
  const cfg = getConfig();
  return typeof cfg.prefix === "string" && cfg.prefix.length > 0 ? cfg.prefix : "/";
}

function getMtnMode() {
  const cfg = getConfig();
  return cfg.mtnMode === true;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function canUseCommand(cmd, isAdmin) {
  const useBy = cmd.config?.useBy ?? 0;
  if (useBy === 0) return true;
  if (useBy === 1) return isAdmin;
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
  const prefix = getPrefix();
  const prefixEscaped = escapeRegex(prefix);
  const reCommand = new RegExp("^" + prefixEscaped + "(\\w+)");
  const rePrefixOnly = new RegExp("^" + prefixEscaped + "\\s*$");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = (msg.text || "").trim();

    let permission = { allowed: true, isAdmin: false };
    if (userId) {
      try {
        await upsertBotUser(userId, {
          username: msg.from?.username,
          first_name: msg.from?.first_name,
          last_name: msg.from?.last_name,
        });
      } catch (err) {
        console.error("upsertBotUser error:", err.message);
      }
      permission = await getPermission(userId);
      if (!permission.allowed) {
        bot.sendMessage(chatId, "⛔ Bạn không có quyền sử dụng bot.");
        return;
      }
    }
    if (getMtnMode() && !permission.isAdmin) {
      bot.sendMessage(chatId, "🔧 Bot đang bảo trì, chỉ admin có thể sử dụng.");
      return;
    }

    const match = text.match(reCommand);
    let cmdName = match ? match[1].toLowerCase() : null;
    if (!cmdName && rePrefixOnly.test(text)) cmdName = "help";

    if (cmdName) {
      const actualCmdName = aliases[cmdName] || cmdName;
      const cmd = commands[actualCmdName];

      if (cmd) {
        if (!canUseCommand(cmd, permission.isAdmin)) {
          bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
          return;
        }

        const parsed = parseCommand(text, prefix);
        const ctx = {
          commands,
          parsed,
          aliases,
          isAdmin: permission.isAdmin,
          pingStart: Date.now(),
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
          const ctx = { commands, parsed: parseCommand(text, prefix), aliases, isAdmin: permission.isAdmin };
          notfoundCmd.execute(bot, msg, ctx);
        } else {
          bot.sendMessage(chatId, `❓ Lệnh ${prefix}${cmdName} không tồn tại. Gõ ${prefix}help để xem danh sách lệnh.`);
        }
      }
      return;
    }

    if (text) {
      const firstWord = text.split(/\s+/)[0]?.toLowerCase();
      if (firstWord) {
        const actualCmdName = aliases[firstWord] || firstWord;
        const cmd = commands[actualCmdName];
        if (cmd && cmd.config?.usePrefix === false) {
          if (!canUseCommand(cmd, permission.isAdmin)) {
            bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
            return;
          }
          const parsed = parseCommand(prefix + text, prefix);
          const ctx = {
            commands,
            parsed,
            aliases,
            isAdmin: permission.isAdmin,
            pingStart: Date.now(),
          };
          try {
            await cmd.execute(bot, msg, ctx);
            await saveCommandHistory(userId, actualCmdName, text, true);
          } catch (err) {
            await saveCommandHistory(userId, actualCmdName, text, false, err.message);
            throw err;
          }
          return;
        }
      }
    }

    if (text) {
      for (const cmd of Object.values(commands)) {
        if (typeof cmd.handleMessage === "function") {
          try {
            const handled = await cmd.handleMessage(bot, msg);
            if (handled) return;
          } catch (err) {
            console.error("handleMessage error:", err);
          }
        }
      }
    }
  });

  bot.on("callback_query", async (query) => {
    const userId = query.from?.id;
    const data = query.data;

    if (userId) {
      const permission = await getPermission(userId);
      if (!permission.allowed) {
        await bot.answerCallbackQuery(query.id, { text: "⛔ Bạn không có quyền." });
        return;
      }
      if (getMtnMode() && !permission.isAdmin) {
        await bot.answerCallbackQuery(query.id, { text: "🔧 Bot đang bảo trì." });
        return;
      }
      const ctx = { commands, parsed: {}, aliases, isAdmin: permission.isAdmin };
      const handler = findCallbackHandler(commands, data);
      if (handler) {
        await handler.handleCallback(bot, query, ctx);
      }
    }
  });
}

module.exports = { setupListen, getPermission, canUseCommand, loadCommands };
