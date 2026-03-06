const os = require("os");

const config = {
  name: "uptime",
  description: "Xem thông tin hệ thống: uptime, RAM, CPU",
  useBy: 1,
  usePrefix: true,
  category: "admin",
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function execute(bot, msg) {
  const chatId = msg.chat.id;

  const sysUptime = os.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const cpus = os.cpus();
  const procUptime = process.uptime();
  const procMem = process.memoryUsage();

  let text = "📊 Hệ thống\n\n";

  text += "⏱ Uptime\n";
  text += `   • Máy: ${formatUptime(sysUptime)}\n`;
  text += `   • Bot: ${formatUptime(procUptime)}\n\n`;

  text += "🧠 RAM\n";
  text += `   • Tổng: ${formatBytes(totalMem)}\n`;
  text += `   • Dùng: ${formatBytes(usedMem)} (${((usedMem / totalMem) * 100).toFixed(0)}%)\n`;
  text += `   • Trống: ${formatBytes(freeMem)}\n`;
  text += `   • Process (RSS): ${formatBytes(procMem.rss)}\n\n`;

  text += "🔧 CPU\n";
  text += `   • Nhân: ${cpus.length}\n`;
  text += `   • Model: ${cpus[0]?.model?.trim() || "N/A"}\n`;
  if (loadAvg && loadAvg.length > 0) {
    text += `   • Load (1/5/15m): ${loadAvg.map((l) => l.toFixed(2)).join(" / ")}\n`;
  }
  text += `   • Platform: ${os.platform()} (${os.arch()})\n`;

  bot.sendMessage(chatId, text.trim());
}

module.exports = { config, execute };
