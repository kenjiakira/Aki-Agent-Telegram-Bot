const cron = require("node-cron");
const { postNews } = require("./rss");
const { cleanupOldNews } = require("./database");

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
}

module.exports = { setupScheduler };
