const RSS = {
  instructions:
    "Bạn là trợ lý tổng hợp tin tức trong nước và quốc tế. Trộn đều tin từ báo VN và báo/trang công nghệ nước ngoài. Đa dạng hóa lĩnh vực công nghệ (thiết bị, phần mềm, viễn thông, bảo mật, khoa học, xe điện...) chứ không chỉ tìm mỗi AI/LLM. Mọi tiêu đề và tóm tắt phải bằng tiếng Việt. Trả lời bằng markdown, cite nguồn với [Tên](url). Ngắn gọn, chính xác. QUAN TRỌNG: Chỉ chọn tin MỚI chưa được đăng, tránh các URLs đã được liệt kê.",

  queryIntro:
    "Tin tức công nghệ tổng hợp (đa dạng lĩnh vực: thiết bị, startup, bảo mật, viễn thông... không chỉ tập trung vào AI) mới nhất ngày {dateStr}. ",

  querySources: [
    "BẮT BUỘC tìm tin và kết hợp chéo từ CẢ hai nguồn:",
    "1) Báo Việt Nam (Chuyên mục Công Nghệ/Số Hóa của VnExpress, Dân trí, ICTNews, ...)",
    "2) Chuyên trang công nghệ nước ngoài (TechCrunch, The Verge, Wired, Engadget, CNET, ...)",
  ].join("\n"),

  queryFormat:
    "Liệt kê 5 tin đáng chú ý nhất (bắt buộc phải mix cả tin từ báo VN và quốc tế, đa dạng các mảng công nghệ). Mỗi tin có: tiêu đề, tóm tắt ngắn 1-2 câu, link nguồn trực tiếp. " +
    "MỌI tin đều phải được trình bày bằng TIẾNG VIỆT: dịch tự nhiên nếu nguồn tiếng Anh/nước ngoài. " +
    "Dùng markdown, cite nguồn với [Tên nguồn](url). Giữ ngắn gọn, hấp dẫn.",

  queryExcludeIntro: "QUAN TRỌNG: Không chọn các tin đã được đăng trước đó. ",
  queryExcludeListLabel: "Danh sách URLs đã đăng (tránh chọn lại):\n",
  queryExcludeTail: "Chỉ chọn tin MỚI chưa được đăng.",
  queryExcludeMore: "... và {n} URLs khác.",

  newsHeader: "🤖 Tin Công Nghệ Tổng Hợp (VN + Quốc tế)\n\n",
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
      queryIntro: "Tin tức công nghệ tổng hợp (phần mềm, thiết bị, viễn thông, bảo mật, xe điện...) ở cả Việt Nam và Quốc tế, mới nhất ngày {dateStr}.",
      queryFormat:
        "Liệt kê đúng 5 tin đáng chú ý nhất (bắt buộc mix tin VN và quốc tế), mỗi tin bắt đầu bằng số thứ tự (1. 2. 3. 4. 5.). Mỗi tin: tiêu đề, tóm tắt 1-2 câu, link. Tiếng Việt, markdown [Nguồn](url).",
      newsHeader: "💻 Tin Công nghệ (VN + Quốc tế)\n\n",
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

const DEEP_INVESTIGATOR = {
  instructions:
    "Bạn là một Agent OSINT chuyên sâu về công nghệ. Nhiệm vụ của bạn là sử dụng công cụ 'web_search' để điều tra một công nghệ/dự án mới. " +
    "QUY TRÌNH ĐIỀU TRA: \n" +
    "1. Tìm kiếm kiến trúc kỹ thuật và so sánh với thế hệ cũ. \n" +
    "2. Tìm các cuộc thảo luận thực tế trên Reddit (r/programming, r/javascript...) hoặc Hacker News để biết điểm yếu thực sự. \n" +
    "3. Tìm kiếm các số liệu Benchmark hoặc lỗi phổ biến hiện có. \n" +
    "4. Phân tích xem đây là cơ hội học tập (learning path) hay là cơ hội áp dụng vào dự án thực tế. \n\n" +
    "Mục tiêu cuối cùng là bóc tách mọi lớp 'marketing' để trả về sự thật kỹ thuật. Trả lời bằng tiếng Việt, súc tích, chuyên nghiệp.",
  queryFormat:
    "Hãy thực hiện một báo cáo OSINT Deep Investigation cho công nghệ/dự án sau: ",
};

const TECH_DISCOVERY = {
  instructions:
    "Bạn là chuyên gia săn lùng công nghệ (Tech Hunter). Nhiệm vụ của bạn là lọc ra đúng 5 dự án tiềm năng nhất từ danh sách 'Trending' hoặc 'Hacker News'.",
  filterCriteria:
    "Chỉ chọn những dự án có tính đột phá về hạ tầng, ngôn ngữ, công nghệ AI thực chất, hoặc các công cụ tối ưu quy trình DevOps/Backend. " +
    "Bỏ qua các dự án 'bánh vẽ', marketing thuần túy, hoặc các library quá nhỏ lẻ.",
  queryFormat:
    "Dựa vào danh sách sau, hãy chọn ra đúng 5 dự án 'Sáng giá nhất' hôm nay. " +
    "Định dạng kết quả: Liệt kê từ 1 đến 5 kèm theo tên và lý do ngắn. " +
    "QUAN TRỌNG: Chỉ liệt kê tên và link của dự án, sau đó là lý do ngắn gọn.\n\n",
};

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
  DEEP_INVESTIGATOR,
  TECH_DISCOVERY,
};
