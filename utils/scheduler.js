const cron = require("node-cron");
const { postNews } = require("./rss");
const { cleanupOldNews } = require("./database");
const { loadScheduledCommands } = require("../commands/schedule");

function setupScheduler(bot) {

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
