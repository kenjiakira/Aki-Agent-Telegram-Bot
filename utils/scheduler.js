const cron = require("node-cron");
const { postNews } = require("./rss");
const { cleanupOldNews, getDueReminders, markReminderSent } = require("./database");
const { loadScheduledCommands } = require("../commands/schedule");

function setupScheduler(bot) {
  // Nhắc việc: mỗi phút kiểm tra và gửi reminder đến hạn
  cron.schedule("* * * * *", async () => {
    try {
      const due = await getDueReminders();
      for (const r of due) {
        try {
          await bot.sendMessage(
            r.chat_id,
            `⏰ **Nhắc:** ${r.text}`,
            { parse_mode: "Markdown" }
          );
          await markReminderSent(r.id);
        } catch (err) {
          console.error("Reminder send error:", r.id, err.message);
        }
      }
    } catch (err) {
      console.error("Reminder job error:", err.message);
    }
  });

  cron.schedule("0 8 * * *", async () => {
    console.log("Posting AI news...");
    try {
      await postNews(bot);
    } catch (err) {
      console.error("Error posting news:", err.message);
    }
  });

  cron.schedule("0 2 * * 0", async () => {
    console.log("Cleaning up old news...");
    try {
      const deleted = await cleanupOldNews(30);
      console.log(`✅ Đã xóa ${deleted} tin cũ.`);
    } catch (err) {
      console.error("Error cleanup:", err.message);
    }
  });

  setTimeout(() => {
    loadScheduledCommands(bot).catch(err => {
      console.error("Error loading scheduled commands:", err.message);
    });
    }, 2000);
}

module.exports = { setupScheduler };
