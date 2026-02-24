const { 
  saveScheduledCommand, 
  getScheduledCommands, 
  deleteScheduledCommand,
  updateScheduledCommand 
} = require("../utils/database");
const { hasFlag, getFlag } = require("../utils/commandParser");
const cron = require("node-cron");

const config = {
  name: "schedule",
  description: "Lên lịch chạy command tự động",
  useBy: 1,
  category: "admin",
};

// Store active cron jobs
const activeJobs = new Map();

/**
 * Parse time string (HH:MM) to cron expression
 */
function parseTimeToCron(timeStr, scheduleType) {
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error("Định dạng thời gian không hợp lệ. Dùng HH:MM (ví dụ: 09:00)");
  }

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Giờ hoặc phút không hợp lệ");
  }

  // Format: minute hour day month dayOfWeek
  if (scheduleType === "daily") {
    return `${minute} ${hour} * * *`; // Every day at HH:MM
  } else if (scheduleType === "weekly") {
    return `${minute} ${hour} * * 0`; // Every Sunday at HH:MM
  } else {
    // Once: schedule for next occurrence (today or tomorrow)
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hour, minute, 0, 0);
    scheduled.setSeconds(0);
    scheduled.setMilliseconds(0);
    
    // If time already passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    // Cron format: minute hour day month dayOfWeek
    // For "once", we schedule specific date
    const day = scheduled.getDate();
    const month = scheduled.getMonth() + 1; // Cron months are 1-12
    
    return `${minute} ${hour} ${day} ${month} *`;
  }
}

function startScheduledJob(bot, schedule) {
  const cronExpr = parseTimeToCron(schedule.schedule_time, schedule.schedule_type);
  
  const job = cron.schedule(cronExpr, async () => {
    console.log(`⏰ Chạy scheduled command: ${schedule.command_name}`);
    
    try {
      const { loadCommands } = require("../utils/commands");
      const { commands } = loadCommands();
      const cmd = commands[schedule.command_name];
      
      if (!cmd) {
        throw new Error(`Command ${schedule.command_name} không tồn tại`);
      }

      const mockMsg = {
        chat: { id: schedule.user_id },
        from: { id: schedule.user_id },
        text: schedule.command_text,
      };

      const ctx = { commands, parsed: null };
      await cmd.execute(bot, mockMsg, ctx);

      if (schedule.schedule_type === "once") {
        await updateScheduledCommand(schedule.id, { enabled: false });
        if (activeJobs.has(schedule.id)) {
          activeJobs.get(schedule.id).stop();
          activeJobs.delete(schedule.id);
        }
      }
    } catch (err) {
      console.error(`❌ Lỗi khi chạy scheduled command ${schedule.id}:`, err.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh",
  });

  activeJobs.set(schedule.id, job);
  return job;
}

async function loadScheduledCommands(bot) {
  try {
    const schedules = await getScheduledCommands(null, true);
    for (const schedule of schedules) {
      if (!activeJobs.has(schedule.id)) {
        startScheduledJob(bot, schedule);
      }
    }
    console.log(`✅ Đã load ${schedules.length} scheduled commands`);
  } catch (err) {
    console.error("❌ Lỗi khi load scheduled commands:", err.message);
  }
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const parsed = ctx?.parsed;

  const action = parsed?.args[0] || "list";

  try {
    if (action === "add") {
      const commandName = parsed?.args[1];
      if (!commandName) {
        await bot.sendMessage(chatId, "❌ Thiếu tên command. Ví dụ: /schedule add post --time=\"09:00\" --daily");
        return;
      }

      const time = getFlag(parsed, "time");
      if (!time) {
        await bot.sendMessage(chatId, "❌ Thiếu --time. Ví dụ: /schedule add post --time=\"09:00\" --daily");
        return;
      }

      const scheduleType = getFlag(parsed, "daily") ? "daily" 
        : getFlag(parsed, "weekly") ? "weekly"
        : "once";

      const commandText = `/${commandName} ${parsed?.args.slice(2).join(" ") || ""}`.trim();
      
      const schedule = await saveScheduledCommand(
        userId,
        commandName,
        commandText,
        time,
        scheduleType,
        true
      );

      startScheduledJob(bot, schedule);

      let text = "✅ Đã tạo scheduled command:\n\n";
      text += `📝 Command: ${commandText}\n`;
      text += `⏰ Thời gian: ${time}\n`;
      text += `🔄 Loại: ${scheduleType === "daily" ? "Hàng ngày" : scheduleType === "weekly" ? "Hàng tuần" : "Một lần"}\n`;
      text += `🆔 ID: ${schedule.id}\n`;
      text += `\n💡 Dùng /schedule list để xem danh sách.`;

      await bot.sendMessage(chatId, text);
    } else if (action === "list") {
      const schedules = await getScheduledCommands(userId);

      if (schedules.length === 0) {
        await bot.sendMessage(chatId, "📭 Chưa có scheduled command nào.");
        return;
      }

      let text = `📋 Danh sách scheduled commands (${schedules.length})\n\n`;

      schedules.forEach((schedule, index) => {
        const status = schedule.enabled ? "✅" : "❌";
        const typeLabel = schedule.schedule_type === "daily" ? "Hàng ngày" 
          : schedule.schedule_type === "weekly" ? "Hàng tuần"
          : "Một lần";
        
        text += `${index + 1}. ${status} /${schedule.command_name}\n`;
        text += `   ⏰ ${schedule.schedule_time} (${typeLabel})\n`;
        text += `   📝 ${schedule.command_text}\n`;
        text += `   🆔 ID: ${schedule.id}\n`;
        text += `\n`;
      });

      text += `💡 Dùng /schedule delete <id> để xóa.`;

      await bot.sendMessage(chatId, text.trim());
    } else if (action === "delete") {
      const scheduleId = parsed?.args[1];
      if (!scheduleId) {
        await bot.sendMessage(chatId, "❌ Thiếu ID. Ví dụ: /schedule delete 123");
        return;
      }

      if (activeJobs.has(parseInt(scheduleId))) {
        activeJobs.get(parseInt(scheduleId)).stop();
        activeJobs.delete(parseInt(scheduleId));
      }

      await deleteScheduledCommand(scheduleId);
      await bot.sendMessage(chatId, `✅ Đã xóa scheduled command ID: ${scheduleId}`);
    } else if (action === "enable" || action === "disable") {
      const scheduleId = parsed?.args[1];
      if (!scheduleId) {
        await bot.sendMessage(chatId, `❌ Thiếu ID. Ví dụ: /schedule ${action} 123`);
        return;
      }

      const enabled = action === "enable";
      await updateScheduledCommand(parseInt(scheduleId), { enabled });

      if (enabled) {
        const schedules = await getScheduledCommands(null, false);
        const schedule = schedules.find(s => s.id === parseInt(scheduleId));
        if (schedule) {
          startScheduledJob(bot, schedule);
        }
      } else {
        if (activeJobs.has(parseInt(scheduleId))) {
          activeJobs.get(parseInt(scheduleId)).stop();
          activeJobs.delete(parseInt(scheduleId));
        }
      }

      await bot.sendMessage(chatId, `✅ Đã ${enabled ? "bật" : "tắt"} scheduled command ID: ${scheduleId}`);
    } else {
      await bot.sendMessage(
        chatId,
        "📖 Cách sử dụng:\n\n" +
        "• /schedule add <command> --time=\"HH:MM\" --daily\n" +
        "  Ví dụ: /schedule add post --time=\"09:00\" --daily\n\n" +
        "• /schedule list - Xem danh sách\n" +
        "• /schedule delete <id> - Xóa\n" +
        "• /schedule enable <id> - Bật\n" +
        "• /schedule disable <id> - Tắt"
      );
    }
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute, loadScheduledCommands };
