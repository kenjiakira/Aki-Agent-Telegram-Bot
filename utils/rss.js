const Parser = require("rss-parser");
const OpenAI = require("openai");

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FEEDS = [
  "https://www.artificialintelligence-news.com/feed/",
  "https://openai.com/blog/rss.xml",  
];

async function fetchNews() {
  const all = [];
  for (const url of FEEDS) {
    const feed = await parser.parseURL(url);
    all.push(...feed.items.slice(0, 3));
  }
  return all.slice(0, 5);
}

async function summarize(text) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Tóm tắt tin AI ngắn gọn bằng tiếng Việt, hấp dẫn." },
      { role: "user", content: text },
    ],
  });
  return res.choices[0].message.content;
}

async function postNews(bot) {
  const news = await fetchNews();
  for (const item of news) {
    const summary = await summarize(item.title + " " + item.contentSnippet);
    const message = `🔥 ${item.title}\n\n${summary}\n\n🔗 ${item.link}`;
    await bot.sendMessage(process.env.CHANNEL_ID, message);
  }
}

module.exports = { postNews };
