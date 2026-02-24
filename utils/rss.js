const OpenAI = require("openai");
const {
  isAlreadyPosted,
  savePostedNews,
  getPostedUrls,
  extractUrls,
} = require("./database");
const { formatDateVN } = require("./time");

const MODEL = process.env.OPENAI_NEWS_MODEL;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildQuery(postedUrls = []) {
  const dateStr = formatDateVN(new Date());

  let query = `Tin tức công nghệ AI và software mới nhất ngày ${dateStr}. `;
  query += `Liệt kê 5 tin quan trọng, mỗi tin có: tiêu đề, tóm tắt ngắn 1-2 câu, link nguồn. `;
  query += `Trả lời bằng tiếng Việt, dùng markdown, cite sources với [Tên](url). Giữ ngắn gọn, hấp dẫn.`;

  if (postedUrls.length > 0) {
    query += `\n\nQUAN TRỌNG: Không chọn các tin đã được đăng trước đó. `;
    query += `Danh sách URLs đã đăng (tránh chọn lại):\n`;
    query += postedUrls.slice(0, 20).join("\n");
    if (postedUrls.length > 20) {
      query += `\n... và ${postedUrls.length - 20} URLs khác.`;
    }
    query += `\nChỉ chọn tin MỚI chưa được đăng.`;
  }

  return query;
}

async function fetchNews() {  
  let postedUrls = [];
  try {
    postedUrls = await getPostedUrls(50); 
  } catch (err) {
    console.warn("⚠️ Không lấy được danh sách URLs đã post:", err.message);
  }

  const query = buildQuery(postedUrls);

  const response = await openai.responses.create({
    model: MODEL,
    input: [{ role: "user", content: query }],
    tools: [{ type: "web_search" }],
    instructions:
      "Bạn là trợ lý tổng hợp tin tức. Trả lời bằng markdown, cite nguồn với [Tên](url). Ngắn gọn, chính xác. QUAN TRỌNG: Chỉ chọn tin MỚI chưa được đăng trước đó, tránh các URLs đã được liệt kê.",
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

async function postNews(bot, force = false) {
  const channelId = process.env.CHANNEL_ID;
  if (!channelId) throw new Error("CHANNEL_ID chưa cấu hình trong .env");

  const content = await fetchNews();
  if (!content.trim()) throw new Error("Không lấy được nội dung tin");

  const urls = extractUrls(content);
  console.log(`📰 Tìm thấy ${urls.length} URLs trong tin:`, urls);

  const isDuplicate = await isAlreadyPosted(content);
  if (!force && isDuplicate) {
    console.log("⚠️ Tin trùng — tự động force post.");
  }

  const header = "🤖 Tin AI & Tech mới nhất\n\n";
  const message = header + content.trim();
  const maxLen = 4000;

  if (message.length <= maxLen) {
    await bot.sendMessage(channelId, message, { parse_mode: "Markdown" });
  } else {
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

  await savePostedNews(content);
  console.log(`✅ Đã lưu tin vào database với ${urls.length} URLs.`);
}

module.exports = { postNews, fetchNews };
