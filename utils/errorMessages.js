const SUGGESTION = " Thử lại sau vài phút hoặc kiểm tra cấu hình.";

function normalizeMessage(err) {
  const msg = (err && (err.message || err)) || "Lỗi không xác định";
  return String(msg).trim();
}

function formatError(err, context = null) {
  let short = normalizeMessage(err);

  if (context === "rss") {
    if (/fetch|ECONNREFUSED|timeout|network/i.test(short)) {
      short = "không kết nối được nguồn tin (RSS/API)";
    } else if (/openai|api key|401|403/i.test(short)) {
      short = "lỗi API (OpenAI/key). Kiểm tra OPENAI_API_KEY và quota.";
    }
  } else if (context === "database") {
    if (/connect|ECONNREFUSED|supabase/i.test(short)) {
      short = "không kết nối được database. Kiểm tra SUPABASE_URL và key.";
    }
  } else if (context === "api") {
    if (/401|403|api key/i.test(short)) {
      short = "lỗi xác thực API. Kiểm tra key và quyền.";
    }
  }

  return `❌ Lỗi: ${short}.${SUGGESTION}`;
}

module.exports = { formatError, SUGGESTION };
