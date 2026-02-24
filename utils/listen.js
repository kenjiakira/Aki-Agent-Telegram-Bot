const { loadCommands } = require("./commands");

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
  const commands = loadCommands();

  bot.on("message", (msg) => {
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
      const cmd = commands[cmdName];
      if (cmd) {
        if (!canUseCommand(cmd, userId)) {
          bot.sendMessage(chatId, "⛔ Chỉ admin mới dùng được lệnh này.");
          return;
        }
        const ctx = { commands };
        cmd.execute(bot, msg, ctx);
      }
      return;
    }

    bot.sendMessage(chatId, "Bot đang hoạt động OK 🚀");
  });
}

module.exports = { setupListen, hasPermission, isAdmin, loadCommands };
