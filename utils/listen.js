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

/** useBy: 0 = all, 1 = admin */
function canUseCommand(cmd, userId) {
  const useBy = cmd.config?.useBy ?? 0;
  if (useBy === 0) return true;
  if (useBy === 1) return isAdmin(userId);
  return false;
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
      // Check aliases first
      const actualCmdName = aliases[cmdName] || cmdName;
      const cmd = commands[actualCmdName];
      
      if (cmd) {
        if (!canUseCommand(cmd, userId)) {
          bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
          return;
        }
        
        // Parse command with flags
        const parsed = parseCommand(text);
        const ctx = { 
          commands, 
          parsed,
          aliases,
        };
        
        // Execute command and save history
        try {
          await cmd.execute(bot, msg, ctx);
          // Save successful command history
          await saveCommandHistory(userId, actualCmdName, text, true);
        } catch (err) {
          // Save failed command history
          await saveCommandHistory(userId, actualCmdName, text, false, err.message);
          throw err; // Re-throw to let command handle error display
        }
      } else {
        // Lệnh không tồn tại
        const notfoundCmd = commands["notfound"];
        if (notfoundCmd) {
          const ctx = { commands, parsed: parseCommand(text), aliases };
          notfoundCmd.execute(bot, msg, ctx);
        } else {
          bot.sendMessage(chatId, `❓ Lệnh /${cmdName} không tồn tại. Gõ /help để xem danh sách lệnh.`);
        }
      }
      return;
    }

    bot.sendMessage(chatId, "Bot đang hoạt động OK 🚀");
  });
}

module.exports = { setupListen, hasPermission, isAdmin, loadCommands };
