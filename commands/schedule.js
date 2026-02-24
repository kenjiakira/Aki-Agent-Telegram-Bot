const { 
  saveScheduledCommand, 
  getScheduledCommands, 
  deleteScheduledCommand,
  updateScheduledCommand 
} = require("../utils/database");
const { hasFlag, getFlag } = require("../utils/commandParser");
const { todayAtVN, getVNDateParts } = require("../utils/time");
const cron = require("node-cron");

const config = {
  name: "schedule",
  description: "Lên lịch chạy command tự động",
  useBy: 1,
  category: "admin",
  callbacks: ["schedule_list", "schedule_refresh", "schedule_help", "schedule_add", "schedule_delete_"],
};

const activeJobs = new Map();
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

  if (scheduleType === "daily") {
    return `${minute} ${hour} * * *`;
  } else if (scheduleType === "weekly") {
    return `${minute} ${hour} * * 0`;
  } else {
    // once: giờ nhập là giờ VN (UTC+7)
    const nextRun = todayAtVN(hour, minute);
    const parts = getVNDateParts(nextRun);
    return `${parts.minute} ${parts.hour} ${parts.day} ${parts.month} *`;
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

function getMainKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📋 Xem lịch", callback_data: "schedule_list" },
          { text: "➕ Cách thêm", callback_data: "schedule_add" },
          { text: "📖 Hướng dẫn", callback_data: "schedule_help" },
        ],
      ],
    },
  };
}

function getListKeyboard(schedules) {
  const rows = [[{ text: "🔄 Làm mới", callback_data: "schedule_refresh" }]];
  if (schedules.length > 0) {
    const deleteRow = schedules.map((s) => ({
      text: `🗑 ${s.id}`,
      callback_data: `schedule_delete_${s.id}`,
    }));
    rows.push(deleteRow);
  }
  return { reply_markup: { inline_keyboard: rows } };
}

function getHelpText() {
  return (
    "📖 Cách sử dụng /schedule\n\n" +
    "• /schedule add <command> --time=\"HH:MM\" --daily\n" +
    "  Ví dụ: /schedule add post --time=\"09:00\" --daily\n\n" +
    "• /schedule list — Xem danh sách\n" +
    "• /schedule delete <id> — Xóa\n" +
    "• /schedule enable <id> — Bật\n" +
    "• /schedule disable <id> — Tắt"
  );
}

function getAddHintText() {
  return (
    "➕ Thêm lịch\n\n" +
    "Gõ lệnh:\n" +
    "/schedule add post --time=\"09:00\" --daily\n\n" +
    "• --daily — hàng ngày\n" +
    "• --weekly — hàng tuần (Chủ nhật)\n" +
    "• Bỏ qua — chạy một lần"
  );
}

function buildListText(schedules) {
  if (schedules.length === 0) return null;
  let text = `📋 Danh sách scheduled commands (${schedules.length})\n\n`;
  schedules.forEach((schedule, index) => {
    const status = schedule.enabled ? "✅" : "❌";
    const typeLabel = schedule.schedule_type === "daily" ? "Hàng ngày"
      : schedule.schedule_type === "weekly" ? "Hàng tuần"
      : "Một lần";
    text += `${index + 1}. ${status} /${schedule.command_name}\n`;
    text += `   ⏰ ${schedule.schedule_time} (${typeLabel}, giờ VN)\n`;
    text += `   📝 ${schedule.command_text}\n`;
    text += `   🆔 ID: ${schedule.id}\n\n`;
  });
  text += "💡 Bấm 🗑 <id> để xóa, hoặc /schedule delete <id>.";
  return text;
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const userId = query.from?.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  if (data === "schedule_list" || data === "schedule_refresh") {
    const schedules = await getScheduledCommands(userId);
    if (schedules.length === 0) {
      await bot.sendMessage(chatId, "📭 Chưa có scheduled command nào.\n\nChọn nút bên dưới:", getMainKeyboard());
      return;
    }
    const text = buildListText(schedules);
    await bot.sendMessage(chatId, text, getListKeyboard(schedules));
    return;
  }

  if (data === "schedule_help") {
    await bot.sendMessage(chatId, getHelpText());
    return;
  }

  if (data === "schedule_add") {
    await bot.sendMessage(chatId, getAddHintText());
    return;
  }

  if (data.startsWith("schedule_delete_")) {
    const idStr = data.replace("schedule_delete_", "");
    const scheduleId = parseInt(idStr, 10);
    if (!idStr || isNaN(scheduleId)) {
      await bot.sendMessage(chatId, "❌ ID không hợp lệ.");
      return;
    }
    if (activeJobs.has(scheduleId)) {
      activeJobs.get(scheduleId).stop();
      activeJobs.delete(scheduleId);
    }
    await deleteScheduledCommand(scheduleId);
    await bot.sendMessage(chatId, `✅ Đã xóa scheduled command ID: ${scheduleId}`);
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
      text += `\n💡 Bấm nút bên dưới để xem danh sách.`;

      await bot.sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [[{ text: "📋 Xem lịch", callback_data: "schedule_list" }]],
        },
      });
    } else if (action === "list") {
      const schedules = await getScheduledCommands(userId);

      if (schedules.length === 0) {
        await bot.sendMessage(chatId, "📭 Chưa có scheduled command nào.\n\nChọn nút bên dưới:", getMainKeyboard());
        return;
      }

      await bot.sendMessage(chatId, buildListText(schedules), getListKeyboard(schedules));
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
        "📅 Lịch chạy command\n\nChọn nút bên dưới hoặc gõ /schedule list, /schedule add ...",
        getMainKeyboard()
      );
    }
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Lỗi: ${err.message}`);
  }
}

module.exports = { config, execute, handleCallback, loadScheduledCommands };
