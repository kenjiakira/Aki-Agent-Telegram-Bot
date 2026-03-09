const axios = require("axios");

const TIKTOK_API_BASE = process.env.TIKTOK_API_URL;

const TIKTOK_LINK_REGEX = /https?:\/\/[^\s<>"']*tiktok\.com[^\s<>"']*/gi;

function isValidTikTokUrl(url) {
  if (!url || typeof url !== "string") return false;
  const urlWithoutQuery = url.split("?")[0];
  return /^(https?:\/\/)?(www\.|vm\.|vt\.|m\.)?tiktok\.com(\/[@\w.]+\/(?:video|photo)\/\d+|\/@[\w.]+\/video\/\d+|\/v\/\d+|\/.+)?/.test(
    urlWithoutQuery
  );
}

async function resolveTikTokShortUrl(url) {
  try {
    if (url.includes("vt.tiktok.com") || url.includes("vm.tiktok.com")) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        validateStatus: null,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const res = response.request?.res;
      if (res?.responseUrl) return res.responseUrl;
      if (response.headers?.location) return response.headers.location;
    }
    return url;
  } catch (err) {
    return url;
  }
}

function hasApiUrl() {
  return TIKTOK_API_BASE.length > 0;
}

function extractTikTokUrl(text) {
  if (!text || typeof text !== "string") return null;
  const matches = text.trim().match(TIKTOK_LINK_REGEX);
  if (!matches) return null;
  for (const raw of matches) {
    const u = raw.replace(/[)\]}>"'\s]+$/, "").trim();
    if (isValidTikTokUrl(u)) return u;
  }
  return null;
}

async function fetchVideoInfo(url, opts = {}) {
  if (!url || !url.includes("tiktok")) {
    return { ok: false, error: "URL TikTok không hợp lệ" };
  }
  if (!isValidTikTokUrl(url)) {
    return { ok: false, error: "URL TikTok không đúng định dạng" };
  }
  const resolvedUrl = await resolveTikTokShortUrl(url.trim());
  const apiUrl = `${TIKTOK_API_BASE}/`;
  try {
    const { data } = await axios.post(
      apiUrl,
      new URLSearchParams({ url: resolvedUrl, hd: opts.hd ? "1" : "0" }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      }
    );

    if (data?.code !== 0) {
      const msg = data?.msg || data?.message || "API trả về lỗi";
      return { ok: false, error: msg };
    }

    const info = data?.data ?? data;
    const play = info?.play || info?.wmplay || "";
    const hdplay = info?.hdplay || info?.play || "";
    const title = (info?.title || "").trim() || "TikTok video";
    const images = info?.images || info?.album || [];
    const mediaType = Array.isArray(images) && images.length > 0 ? "photo" : "video";

    if (process.env.DEBUG_TIKTOK) {
      console.log("[tiktok] API response keys:", Object.keys(info || {}));
      console.log("[tiktok] mediaType:", mediaType);
      console.log("[tiktok] play:", play ? `${play.slice(0, 80)}...` : "(empty)");
      console.log("[tiktok] hdplay:", hdplay ? `${hdplay.slice(0, 80)}...` : "(empty)");
      console.log("[tiktok] images count:", Array.isArray(images) ? images.length : 0);
      images?.forEach?.((u, i) => console.log(`[tiktok] images[${i}]:`, u?.slice?.(0, 100) || u));
    }

    return {
      ok: true,
      data: info,
      play: play || hdplay,
      hdplay: hdplay || play,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      mediaType,
      title,
      author: info?.author?.nickname || info?.author?.unique_id || "",
    };
  } catch (err) {
    const message = err?.response?.data?.msg || err?.message || "Lỗi kết nối API";
    return { ok: false, error: message };
  }
}

async function downloadVideoBuffer(videoUrl) {
  if (!videoUrl) return null;
  try {
    const { data } = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      maxContentLength: 100 * 1024 * 1024,
    });
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  } catch {
    return null;
  }
}

async function downloadImageBuffer(imageUrl) {
  if (!imageUrl) return null;
  try {
    const { data } = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 20 * 1024 * 1024,
    });
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  } catch {
    return null;
  }
}

module.exports = {
  TIKTOK_API_BASE,
  TIKTOK_LINK_REGEX,
  hasApiUrl,
  isValidTikTokUrl,
  resolveTikTokShortUrl,
  extractTikTokUrl,
  fetchVideoInfo,
  downloadVideoBuffer,
  downloadImageBuffer,
};
