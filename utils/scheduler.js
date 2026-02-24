const cron = require("node-cron");
const { postNews } = require("./rss");
  
function setupScheduler(bot) {
  cron.schedule("0 8 * * *", async () => {
    console.log("Posting AI news...");
    await postNews(bot);
  });
}

module.exports = { setupScheduler };
