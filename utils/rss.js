const OpenAI = require("openai");

const MODEL = process.env.OPENAI_NEWS_MODEL;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUERY =
  "Tin tức công nghệ AI và software mới nhất hôm nay. Liệt kê 5 tin quan trọng, mỗi tin có: tiêu đề, tóm tắt ngắn 1-2 câu, link nguồn. Trả lời bằng tiếng Việt, dùng markdown, cite sources với [Tên](url). Giữ ngắn gọn, hấp dẫn.";

async function fetchNews() {
  const response = await openai.responses.create({
    model: MODEL,
    input: [{ role: "user", content: QUERY }],
    tools: [{ type: "web_search" }],
    instructions:
      "Bạn là trợ lý tổng hợp tin tức. Trả lời bằng markdown, cite nguồn với [Tên](url). Ngắn gọn, chính xác.",
  });

  const raw =
    response?.output_text ??
    (response?.output ?? [])
      ?.map((item) =>
        (item?.content ?? [])
          .map((c) => c?.text ?? c?.content ?? "")
          .join("")
      )
      .join("") ??
    "";

  return raw;
}

async function postNews(bot) {
  const channelId = process.env.CHANNEL_ID;
  if (!channelId) throw new Error("CHANNEL_ID chưa cấu hình trong .env");

  const content = await fetchNews();
  if (!content.trim()) throw new Error("Không lấy được nội dung tin");

  const header = "🤖 Tin AI & Tech mới nhất\n\n";
  const message = header + content.trim();
  const maxLen = 4000;

  if (message.length <= maxLen) {
    await bot.sendMessage(channelId, message, { parse_mode: "Markdown" });
    return;
  }

  const parts = [];
  let remaining = message;
  while (remaining.length > 0) {
    parts.push(remaining.slice(0, maxLen));
    remaining = remaining.slice(maxLen);
  }
  for (const part of parts) {
    await bot.sendMessage(channelId, part, { parse_mode: "Markdown" });
  }
}

module.exports = { postNews, fetchNews };
