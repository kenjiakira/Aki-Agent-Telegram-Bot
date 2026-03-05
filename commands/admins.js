const { getBotUsers } = require("../utils/database");
const { formatError } = require("../utils/errorMessages");

const config = {
  name: "admins",
  description: "Xem danh sách admin hiện tại (từ DB + env)",
  useBy: 1,
  category: "admin",
};

const ADMIN_IDS_ENV = process.env.ADMIN_USER_IDS
  ? process.env.ADMIN_USER_IDS.split(",").map((id) => id.trim()).filter(Boolean)
  : [];

async function execute(bot, msg) {
  const chatId = msg.chat.id;

  try {
    const fromDb = await getBotUsers({ role: "admin", limit: 100 });
    const fromEnv = new Set(ADMIN_IDS_ENV);
    fromDb.forEach((u) => fromEnv.add(String(u.telegram_id)));

    if (fromEnv.size === 0 && fromDb.length === 0) {
      await bot.sendMessage(chatId, "⚠️ Chưa có admin nào. Cấu hình ADMIN_USER_IDS trong .env hoặc dùng /users setadmin <id>.");
      return;
    }

    let text = "👥 Danh sách Admin\n\n";
    fromDb.forEach((u, i) => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
      const uname = u.username ? `@${u.username}` : "";
      text += `${i + 1}. ID: ${u.telegram_id} — ${name} ${uname}\n`;
    });
    ADMIN_IDS_ENV.forEach((id) => {
      if (!fromDb.some((u) => String(u.telegram_id) === id)) {
        text += `   ID: ${id} (từ .env, chưa có trong DB)\n`;
      }
    });
    text += `\n📊 Tổng: ${fromEnv.size} admin(s). Dùng /users setadmin <id> để thêm admin từ DB.`;

    await bot.sendMessage(chatId, text.trim());
  } catch (err) {
    await bot.sendMessage(chatId, formatError(err, "database"));
  }
}

module.exports = { config, execute };
