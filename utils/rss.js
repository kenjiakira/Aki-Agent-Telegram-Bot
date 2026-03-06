const { getModel, createResponse } = require("../lib/openai");
const {
  isAlreadyPosted,
  savePostedNews,
  getPostedUrls,
  extractUrls,
  getAutoNewsSubscriberIds,
} = require("./database");
const { formatDateVN } = require("./time");
const {
  RSS,
  TOPIC_NEWS,
  TOPIC_IDS,
  buildTopicNewsQuery,
} = require("./prompts");

async function fetchNewsByTopic(topicId, opts = {}) {
  const topic = TOPIC_NEWS.topics[topicId];
  if (!topic) return null;

  let postedUrls = opts.postedUrls;
  if (postedUrls === undefined) {
    try {
      postedUrls = await getPostedUrls(50);
    } catch (err) {
      console.warn("⚠️ Không lấy được danh sách URLs đã post:", err.message);
      postedUrls = [];
    }
  }

  const dateStr = formatDateVN(new Date());
  const query = buildTopicNewsQuery(topicId, { dateStr, postedUrls });
  if (!query) return null;

  const raw = await createResponse({
    model: getModel(),
    instructions: TOPIC_NEWS.instructions,
    input: [{ role: "user", content: query }],
    tools: [{ type: "web_search" }],
  });

  return raw.trim();
}


async function postNewsByTopic(bot, topicId, force = false, targetChatId = null) {
  const chatId = targetChatId || process.env.CHANNEL_ID;
  if (!chatId) throw new Error("CHANNEL_ID hoặc targetChatId chưa được cấu hình");
  if (!TOPIC_NEWS.topics[topicId]) throw new Error(`Chủ đề không hợp lệ: ${topicId}. Dùng: ${TOPIC_IDS.join(", ")}`);

  const content = await fetchNewsByTopic(topicId);
  if (!content || !content.trim()) throw new Error("Không lấy được nội dung tin");

  const urls = extractUrls(content);
  console.log(`📰 [${topicId}] Tìm thấy ${urls.length} URLs trong tin.`);

  const isDuplicate = await isAlreadyPosted(content);
  if (!force && isDuplicate) {
    console.log("⚠️ Tin trùng — bỏ qua (dùng force để post lại).");
    return;
  }

  const header = TOPIC_NEWS.topics[topicId].newsHeader;
  const message = header + content.trim();
  const maxLen = 4000;

  if (message.length <= maxLen) {
    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } else {
    let remaining = message;
    while (remaining.length > 0) {
      const part = remaining.slice(0, maxLen);
      remaining = remaining.slice(maxLen);
      await bot.sendMessage(chatId, part, { parse_mode: "Markdown" });
    }
  }

  await savePostedNews(content);
  console.log(`✅ Đã lưu tin [${topicId}] vào database với ${urls.length} URLs.`);
}

async function postNews(bot, force = false) {
  const topicId = process.env.AUTO_NEWS_TOPIC || "ai";
  await postNewsByTopic(bot, topicId, force);
}


async function sendAutoNewsToSubscribers(bot, topicId) {
  if (!TOPIC_NEWS.topics[topicId]) throw new Error(`Chủ đề không hợp lệ: ${topicId}. Dùng: ${TOPIC_IDS.join(", ")}`);

  const content = await fetchNewsByTopic(topicId);
  if (!content || !content.trim()) throw new Error("Không lấy được nội dung tin");

  const urls = extractUrls(content);
  console.log(`📰 [${topicId}] Tìm thấy ${urls.length} URLs trong tin.`);

  const isDuplicate = await isAlreadyPosted(content);
  if (isDuplicate) {
    console.log("⚠️ Tin trùng — bỏ qua gửi tin tự động.");
    return;
  }

  const header = TOPIC_NEWS.topics[topicId].newsHeader;
  const message = header + content.trim();
  const maxLen = 4000;
  const parts = [];
  let remaining = message;
  while (remaining.length > 0) {
    parts.push(remaining.slice(0, maxLen));
    remaining = remaining.slice(maxLen);
  }

  let chatIds = await getAutoNewsSubscriberIds();
  if (chatIds.length === 0) {
    const fallback = process.env.AUTO_NEWS_CHAT_ID || process.env.CHANNEL_ID;
    if (fallback) chatIds = [fallback];
  }
  if (chatIds.length === 0) {
    console.log("⚠️ Không có subscriber tin tự động và không cấu hình AUTO_NEWS_CHAT_ID/CHANNEL_ID — bỏ qua.");
    return;
  }

  for (const chatId of chatIds) {
    try {
      for (const part of parts) {
        await bot.sendMessage(chatId, part, { parse_mode: "Markdown" });
      }
    } catch (err) {
      console.warn(`⚠️ Không gửi được tin tự động tới ${chatId}:`, err.message);
    }
  }

  await savePostedNews(content);
  console.log(`✅ Đã gửi tin [${topicId}] tới ${chatIds.length} chat(s), lưu DB.`);
}

module.exports = { postNews, postNewsByTopic, fetchNewsByTopic, sendAutoNewsToSubscribers };
