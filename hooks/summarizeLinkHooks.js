const MAX_URL_LENGTH = 2048;
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "0.0.0.1",
];

function validateUrlBasic(url) {
  if (!url || typeof url !== "string") return { valid: false, reason: "URL không hợp lệ." };

  const u = url.trim();
  if (u.length > MAX_URL_LENGTH) return { valid: false, reason: "URL quá dài." };
  if (!/^https?:\/\//i.test(u)) return { valid: false, reason: "Chỉ hỗ trợ link http/https." };

  let hostname;
  try {
    const parsed = new URL(u);
    hostname = (parsed.hostname || "").toLowerCase();
  } catch {
    return { valid: false, reason: "URL không đúng định dạng." };
  }

  if (BLOCKED_HOSTS.includes(hostname)) return { valid: false, reason: "Không hỗ trợ link nội bộ." };
  if (hostname.endsWith(".onion")) return { valid: false, reason: "Không hỗ trợ link .onion." };
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return { valid: false, reason: "Không hỗ trợ link IP trực tiếp." };

  return { valid: true };
}

const validateUrlHooks = [
  validateUrlBasic,
];

function runValidateUrl(url) {
  for (const hook of validateUrlHooks) {
    const result = hook(url);
    if (result && result.valid === false) return result;
  }
  return { valid: true };
}

module.exports = {
  runValidateUrl,
  validateUrlBasic,
  validateUrlHooks,
};
