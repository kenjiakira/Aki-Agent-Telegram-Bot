const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../config.json");

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

const config = {
  name: "maintain",
  description: "Bật/tắt chế độ bảo trì (chỉ admin dùng bot)",
  useBy: 1,
  category: "admin",
};

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const parsed = ctx?.parsed;
  const args = (parsed?.args || []).map((a) => String(a).toLowerCase().trim());

  const cfg = readConfig();
  const prefix = typeof cfg.prefix === "string" && cfg.prefix.length > 0 ? cfg.prefix : "/";
  const current = cfg.mtnMode === true;

  if (args.length === 0) {
    const status = current ? "🔧 Đang bật (chỉ admin)" : "✅ Đang tắt (mọi user)";
    bot.sendMessage(
      chatId,
      `**Chế độ bảo trì (mtnMode)**\n\n` +
        `Trạng thái: ${status}\n\n` +
        `• \`${prefix}maintain on\` — bật (chỉ admin)\n` +
        `• \`${prefix}maintain off\` — tắt (tất cả)`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const arg = args[0];
  const turnOn = ["on", "1", "true", "yes"].includes(arg);
  const turnOff = ["off", "0", "false", "no"].includes(arg);

  if (!turnOn && !turnOff) {
    bot.sendMessage(chatId, "⚠️ Dùng: " + prefix + "maintain on | off");
    return;
  }

  cfg.mtnMode = turnOn;
  try {
    writeConfig(cfg);
  } catch (err) {
    bot.sendMessage(chatId, "❌ Không ghi được config: " + (err.message || "lỗi"));
    return;
  }

  const next = turnOn ? "🔧 Đã bật — chỉ admin dùng bot." : "✅ Đã tắt — mọi user dùng bình thường.";
  bot.sendMessage(chatId, next);
}

module.exports = { config, execute };
