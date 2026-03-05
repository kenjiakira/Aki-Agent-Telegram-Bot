const {
  getBotUsers,
  getBotUser,
  updateBotUser,
} = require("../utils/database");
const { getFlag } = require("../utils/commandParser");
const { formatError } = require("../utils/errorMessages");

const config = {
  name: "users",
  description: "Quản lý người dùng: xem danh sách, cấp/thu hồi quyền, đặt admin",
  useBy: 1,
  category: "admin",
  aliases: ["user", "ql"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const parsed = ctx?.parsed;
  const action = (parsed?.args?.[0] || "list").toLowerCase();
  const targetIdRaw = parsed?.args?.[1];

  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang xử lý...");

  try {
    if (action === "list" || action === "ls") {
      const limit = Math.min(parseInt(getFlag(parsed, "limit", "30")) || 30, 100);
      const roleFilter = getFlag(parsed, "role");
      const allowedFilter = getFlag(parsed, "allowed");
      let allowed = null;
      if (allowedFilter === "true" || allowedFilter === "1") allowed = true;
      if (allowedFilter === "false" || allowedFilter === "0") allowed = false;

      const users = await getBotUsers({
        limit,
        role: roleFilter === "admin" || roleFilter === "user" ? roleFilter : null,
        allowed,
      });

      if (users.length === 0) {
        await bot.editMessageText("📭 Chưa có người dùng nào trong hệ thống.", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        return;
      }

      let text = `👥 Danh sách người dùng (${users.length})\n\n`;
      users.forEach((u, i) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
        const uname = u.username ? `@${u.username}` : "";
        const roleBadge = u.role === "admin" ? "🔐" : "👤";
        const allowBadge = u.allowed ? "✅" : "🚫";
        text += `${i + 1}. ${roleBadge} ${allowBadge} ID: ${u.telegram_id}\n`;
        text += `   ${name} ${uname}\n`;
      });
      text += `\n💡 /users allow <id> | disallow <id> | setadmin <id> | unsetadmin <id>`;

      const toSend = text.trim();
      const maxLen = 4000;
      await bot.editMessageText(
        toSend.length <= maxLen ? toSend : toSend.substring(0, maxLen - 80) + "\n\n... (đã cắt bớt)",
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
      return;
    }

    const targetId = targetIdRaw ? parseInt(String(targetIdRaw).trim(), 10) : null;
    if (!targetId || isNaN(targetId)) {
      await bot.editMessageText(
        "❌ Thiếu hoặc sai ID. Ví dụ: /users allow 123456789",
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
      return;
    }

    const user = await getBotUser(targetId);
    if (!user) {
      await bot.editMessageText(
        `❌ Không tìm thấy user ID ${targetId}. User cần nhắn bot ít nhất một lần để có trong hệ thống.`,
        { chat_id: chatId, message_id: statusMsg.message_id }
      );
      return;
    }

    switch (action) {
      case "allow": {
        await updateBotUser(targetId, { allowed: true });
        await bot.editMessageText(`✅ Đã cho phép user ID ${targetId} sử dụng bot.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        break;
      }
      case "disallow": {
        await updateBotUser(targetId, { allowed: false });
        await bot.editMessageText(`✅ Đã chặn user ID ${targetId} (không được dùng bot).`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        break;
      }
      case "setadmin": {
        await updateBotUser(targetId, { role: "admin" });
        await bot.editMessageText(`✅ Đã đặt user ID ${targetId} làm admin.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        break;
      }
      case "unsetadmin": {
        await updateBotUser(targetId, { role: "user" });
        await bot.editMessageText(`✅ Đã gỡ quyền admin của user ID ${targetId}.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        });
        break;
      }
      default: {
        await bot.editMessageText(
          `❌ Lệnh không hợp lệ. Dùng: list | allow | disallow | setadmin | unsetadmin.\nVí dụ: /users allow ${targetId}`,
          { chat_id: chatId, message_id: statusMsg.message_id }
        );
      }
    }
  } catch (err) {
    await bot.editMessageText(formatError(err, "database"), {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = { config, execute };
