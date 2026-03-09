const axios = require("axios");

const ZM_BASE = process.env.ZM_BASE;
const ZM_API_KEY = process.env.ZM_API_KEY || "";

const URL_REGEX = /https?:\/\/[^\s<>"')}\]]+/gi;

function hasZmioApiKey() {
  return typeof ZM_API_KEY === "string" && ZM_API_KEY.trim().length > 0;
}

function isTikTokUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /tiktok\.com|vm\.tiktok\.|vt\.tiktok\./i.test(url);
}

const SUPPORTED_DOMAIN_PATTERNS = [
  /tiktok\.com|vm\.tiktok\.|vt\.tiktok\./i,
  /douyin\.com|iesdouyin\.com/i,
  /capcut\.com/i,
  /threads\.net/i,
  /instagram\.com|instagr\.am/i,
  /facebook\.com|fb\.com|fb\.watch|fb\.reel|fb\.me|m\.facebook/i,
  /reddit\.com|redd\.it/i,
  /youtube\.com|youtu\.be|y2u\.be/i,
  /twitter\.com|x\.com|t\.co/i,
  /soundcloud\.com/i,
  /mixcloud\.com/i,
  /spotify\.com|open\.spotify\.com/i,
  /weibo\.com|weibo\.cn/i,
];

function isSupportedDownloadUrl(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return false;
  return SUPPORTED_DOMAIN_PATTERNS.some((re) => re.test(url));
}

function extractAnyUrl(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const m = trimmed.match(URL_REGEX);
  if (!m || m.length === 0) return null;
  return m[0].replace(/[)\]}>"'\s]+$/, "").trim();
}

async function fetchAutolink(url, opts = {}) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return { ok: false, error: "URL không hợp lệ" };
  }
  if (!hasZmioApiKey()) {
    return { ok: false, error: "ZM_API_KEY chưa cấu hình trong .env" };
  }

  try {
    const params = new URLSearchParams({ url: url.trim() });
    const getUrl = `${ZM_BASE}/v1/social/autolink?${params.toString()}`;

    const config = {
      headers: {
        apikey: ZM_API_KEY.trim(),
        "Content-Type": "application/json",
      },
      timeout: 20000,
    };

    let data;
    if (opts.cookie && opts.cookie.trim()) {
      data = (await axios.post(
        `${ZM_BASE}/v1/social/autolink`,
        { url: url.trim(), cookie: opts.cookie.trim() },
        config
      )).data;
    } else {
      data = (await axios.get(getUrl, config)).data;
    }

    if (data?.error === true) {
      const msg = data?.message || data?.msg || "API trả về lỗi";
      return { ok: false, error: msg };
    }

    const medias = Array.isArray(data?.medias) ? data.medias : [];
    if (medias.length === 0) {
      return {
        ok: false,
        error: data?.message || data?.msg || "Không có media để tải",
      };
    }

    return {
      ok: true,
      source: data.source || "unknown",
      author: data.author || "",
      title: data.title || "",
      thumbnail: data.thumbnail || "",
      medias,
      type: data.type || "single",
    };
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.msg ||
      err?.message ||
      "Lỗi kết nối API";
    return { ok: false, error: msg };
  }
}

function pickBestVideoUrl(medias) {
  if (!Array.isArray(medias) || medias.length === 0) return null;
  const videos = medias.filter((m) => m.type === "video");
  if (videos.length === 0) return null;

  const order = ["hd_no_watermark", "no_watermark", "watermark"];
  for (const q of order) {
    const found = videos.find((v) => v.quality === q);
    if (found?.url) return found.url;
  }
  return videos[0]?.url || null;
}

function getImageUrls(medias) {
  if (!Array.isArray(medias)) return [];
  return medias
    .filter((m) => m.type === "photo" || m.type === "image")
    .map((m) => m.url)
    .filter(Boolean);
}

module.exports = {
  ZM_BASE,
  hasZmioApiKey,
  isTikTokUrl,
  isSupportedDownloadUrl,
  extractAnyUrl,
  fetchAutolink,
  pickBestVideoUrl,
  getImageUrls,
};
