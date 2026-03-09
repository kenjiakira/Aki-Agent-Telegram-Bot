const RSS = {
  instructions:
    "Bạn là trợ lý tổng hợp tin tức trong nước và quốc tế. Tìm tin từ báo VN và báo nước ngoài (Anh, Mỹ, ...). Mọi tiêu đề và tóm tắt phải bằng tiếng Việt; nếu nguồn tiếng Anh/nước ngoài thì dịch/tóm tắt sang tiếng Việt. Trả lời bằng markdown, cite nguồn với [Tên](url). Ngắn gọn, chính xác. QUAN TRỌNG: Chỉ chọn tin MỚI chưa được đăng trước đó, tránh các URLs đã được liệt kê.",

  queryIntro:
    "Tin tức công nghệ AI và software mới nhất ngày {dateStr}. ",

  querySources: [
    "Tìm tin từ CẢ hai nguồn:",
    "1) Báo Việt Nam (VnExpress, Zing, Thanh Niên, VnEconomy, Cafef, VietNamNet, Dân trí, ...)",
    "2) Báo/quản nước ngoài (Reuters, TechCrunch, The Verge, Ars Technica, Wired, BBC, The Guardian, MIT Technology Review, VentureBeat, ...)",
  ].join("\n"),

  queryFormat:
    "Liệt kê 5 tin quan trọng (ưu tiên pha trộn VN + quốc tế), mỗi tin có: tiêu đề, tóm tắt ngắn 1-2 câu, link nguồn. " +
    "MỌI tin đều phải được viết/tóm tắt bằng TIẾNG VIỆT: nếu nguồn là tiếng Anh hoặc nước ngoài thì dịch/tóm tắt sang tiếng Việt. " +
    "Dùng markdown, cite nguồn với [Tên nguồn](url). Giữ ngắn gọn, hấp dẫn.",

  queryExcludeIntro: "QUAN TRỌNG: Không chọn các tin đã được đăng trước đó. ",
  queryExcludeListLabel: "Danh sách URLs đã đăng (tránh chọn lại):\n",
  queryExcludeTail: "Chỉ chọn tin MỚI chưa được đăng.",
  queryExcludeMore: "... và {n} URLs khác.",

  newsHeader: "🤖 Tin AI & Tech (VN + quốc tế)\n\n",
};

function buildNewsQuery({ dateStr, postedUrls = [] }) {
  let query =
    RSS.queryIntro.replace("{dateStr}", dateStr) +
    "\n" +
    RSS.querySources +
    "\n\n" +
    RSS.queryFormat;

  if (postedUrls.length > 0) {
    query += "\n\n" + RSS.queryExcludeIntro + RSS.queryExcludeListLabel;
    query += postedUrls.slice(0, 20).join("\n");
    if (postedUrls.length > 20) {
      query += "\n" + RSS.queryExcludeMore.replace("{n}", String(postedUrls.length - 20));
    }
    query += "\n" + RSS.queryExcludeTail;
  }

  return query;
}

const LINK_SUMMARY = {
  instructions:
    "Bạn là trợ lý tóm tắt. Khi được cho một URL, hãy đọc nội dung trang đó (dùng web search nếu cần) và tóm tắt trong đúng 5 dòng, bằng tiếng Việt. Ngắn gọn, súc tích, chỉ nêu ý chính.",
  queryFormat: "Tóm tắt nội dung trang sau trong đúng 5 dòng, bằng tiếng Việt:\n\n",
};

const TOPIC_NEWS = {
  instructions:
    "Bạn là trợ lý tổng hợp tin tức. Tìm tin từ báo VN và quốc tế. Mọi tiêu đề và tóm tắt phải bằng tiếng Việt. Trả lời bằng markdown, cite nguồn với [Tên](url). Ngắn gọn, chính xác.",

  topics: {
    crypto: {
      label: "Crypto & Blockchain",
      queryIntro: "Tin tức crypto, bitcoin, blockchain, tiền mã hóa mới nhất ngày {dateStr}.",
      queryFormat:
        "Liệt kê đúng 5 tin, mỗi tin bắt đầu bằng số thứ tự (1. 2. 3. 4. 5.). Mỗi tin: tiêu đề, tóm tắt 1-2 câu, link. Tiếng Việt, markdown [Nguồn](url).",
      newsHeader: "🪙 Tin Crypto & Blockchain\n\n",
    },
    tech: {
      label: "Công nghệ",
      queryIntro: "Tin tức công nghệ (phần mềm, startup, thiết bị) mới nhất ngày {dateStr}.",
      queryFormat:
        "Liệt kê đúng 5 tin, mỗi tin bắt đầu bằng số thứ tự (1. 2. 3. 4. 5.). Mỗi tin: tiêu đề, tóm tắt 1-2 câu, link. Tiếng Việt, markdown [Nguồn](url).",
      newsHeader: "💻 Tin Công nghệ\n\n",
    },
    world: {
      label: "Thế giới",
      queryIntro: "Tin tức thế giới (chính trị, kinh tế, xã hội quốc tế) mới nhất ngày {dateStr}.",
      queryFormat:
        "Liệt kê đúng 5 tin, mỗi tin bắt đầu bằng số thứ tự (1. 2. 3. 4. 5.). Mỗi tin: tiêu đề, tóm tắt 1-2 câu, link. Tiếng Việt, markdown [Nguồn](url).",
      newsHeader: "🌍 Tin Thế giới\n\n",
    },
    ai: {
      label: "AI",
      queryIntro: "Tin tức trí tuệ nhân tạo (AI/ML) mới nhất ngày {dateStr}.",
      queryFormat:
        "Liệt kê đúng 5 tin, mỗi tin bắt đầu bằng số thứ tự (1. 2. 3. 4. 5.). Mỗi tin: tiêu đề, tóm tắt 1-2 câu, link. Tiếng Việt, markdown [Nguồn](url).",
      newsHeader: "🤖 Tin AI\n\n",
    },
  },
};

const WEATHER = {
  instructions:
    "Bạn là trợ lý thời tiết thân thiện. Trả lời bằng tiếng Việt. " +
    "Khi người dùng hỏi về thời tiết ở một địa điểm, hãy gọi tool get_weather với tham số location (tên thành phố hoặc địa điểm). " +
    "Sau khi nhận dữ liệu thời tiết, hãy tóm tắt ngắn gọn, dễ hiểu: nhiệt độ, cảm giác như, độ ẩm, mô tả thời tiết, gió. " +
    "Nếu có thông tin dự báo vài ngày tới, hãy tóm tắt sơ bộ. Luôn lịch sự và hữu ích.",
};

const SOLVE_EXERCISE = {
  instructions:
    "Bạn là gia sư hỗ trợ giải bài tập. Trả lời bằng tiếng Việt. " +
    "Với mỗi bài: nêu rõ từng bước giải, công thức (nếu có), kết quả cuối cùng. " +
    "Giữ lời giải ngắn gọn, dễ hiểu. Nếu là toán: trình bày từng bước; nếu là lý/hóa: ghi công thức và thay số. " +
    "QUAN TRỌNG: KHÔNG dùng Markdown, LaTeX hay ký hiệu đặc biệt. Trả lời trực tiếp bằng văn bản thuần; công thức viết inline (vd: x^2, 2x + 5 = 0).",
};

const GITHUB_SUMMARY = {
  instructions:
    "Bạn là trợ lý tóm tắt PR/Issue cho team. Trả lời bằng tiếng Việt, ngắn gọn." +
    " Format: Tiêu đề | Mô tả 2-3 dòng | Highlight: TODO / Fix / Ưu tiên (nếu có)." +
    " Nếu trong nội dung có TODO, FIXME, [ ] checklist, bug, priority — hãy nêu rõ.",
  queryFormat:
    "Tóm tắt nội dung sau. Bắt đầu bằng tiêu đề, rồi mô tả ngắn. Cuối cùng: '📌 Highlight:' và liệt kê TODO/Fix/ưu tiên (nếu có), mỗi mục 1 dòng.",
};

const TOPIC_IDS = Object.keys(TOPIC_NEWS.topics);

function buildTopicNewsQuery(topicId, { dateStr, postedUrls = [] }) {
  const topic = TOPIC_NEWS.topics[topicId];
  if (!topic) return null;
  let query =
    topic.queryIntro.replace("{dateStr}", dateStr) +
    "\n\n" +
    topic.queryFormat;
  if (postedUrls.length > 0) {
    query += "\n\n" + RSS.queryExcludeIntro + RSS.queryExcludeListLabel;
    query += postedUrls.slice(0, 20).join("\n");
    if (postedUrls.length > 20) {
      query += "\n" + RSS.queryExcludeMore.replace("{n}", String(postedUrls.length - 20));
    }
    query += "\n" + RSS.queryExcludeTail;
  }
  return query;
}

module.exports = {
  RSS,
  buildNewsQuery,
  LINK_SUMMARY,
  WEATHER,
  SOLVE_EXERCISE,
  GITHUB_SUMMARY,
  TOPIC_NEWS,
  TOPIC_IDS,
  buildTopicNewsQuery,
};
