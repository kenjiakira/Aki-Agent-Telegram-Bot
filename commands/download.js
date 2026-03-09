const {
  hasApiUrl,
  extractTikTokUrl,
  fetchVideoInfo,
  downloadVideoBuffer,
} = require("../lib/tiktok");
const {
  hasZmioApiKey,
  isTikTokUrl,
  isSupportedDownloadUrl,
  extractAnyUrl,
  fetchAutolink,
  pickBestVideoUrl,
  getImageUrls,
} = require("../lib/zmio");

const ALBUM_LIMIT = 10;

function hasAnyDownloadApi() {
  return hasApiUrl() || hasZmioApiKey();
}

function chunkMedia(media, limit = ALBUM_LIMIT) {
  const chunks = [];
  for (let i = 0; i < media.length; i += limit) {
    chunks.push(media.slice(i, i + limit));
  }
  return chunks;
}

const config = {
  name: "download",
  description: "Tải video từ link (TikTok, Instagram, YouTube, Facebook, ...)",
  useBy: 0,
  category: "other",
  aliases: ["tiktok", "tk", "dl"],
};

function extractUrl(text) {
  const t = (text || "").trim();
  return extractTikTokUrl(t) || extractAnyUrl(t);
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (ctx?.parsed?.rest || msg.text || "").trim();

  if (!hasAnyDownloadApi()) {
    await bot.sendMessage(chatId, "❌ API chưa cấu hình trong .env (TIKTOK_API_URL hoặc ZM_IO_API_KEY)");
    return;
  }

  const url = extractUrl(text);
  if (!url) {
    await bot.sendMessage(
      chatId,
      "📎 Gửi link video để tải:\n• TikTok: vm.tiktok.com, tiktok.com/@user/video/...\n• Khác: Instagram, YouTube, Facebook, ...\nHoặc dùng: /download <link>"
    );
    return;
  }

  if (isTikTokUrl(url) && hasApiUrl()) {
    await processTikTokDownload(bot, chatId, url);
  } else if (hasZmioApiKey()) {
    await processZmioDownload(bot, chatId, url);
  } else if (isTikTokUrl(url)) {
    await bot.sendMessage(chatId, "❌ Để tải TikTok cần TIKTOK_API_URL trong .env");
  } else {
    await bot.sendMessage(chatId, "❌ Để tải link này cần ZM_API_KEY trong .env. Lấy key: https://zm.io.vn/get-key");
  }
}

async function processTikTokDownload(bot, chatId, url) {
  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang lấy thông tin video...");

  try {
    const result = await fetchVideoInfo(url, { hd: true });
    if (!result.ok) {
      await bot.editMessageText("❌ " + (result.error || "Không lấy được thông tin video."), {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const caption = result.title ? `📌 ${result.title}` : undefined;

    if (result.mediaType === "photo" && result.images?.length > 0) {
      if (process.env.DEBUG_TIKTOK) {
        console.log("[download] Sending photos, URLs:", result.images);
      }
      await bot.editMessageText("⏳ Đang gửi ảnh...", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });

      const media = result.images.map((imgUrl, i) => ({
        type: "photo",
        media: imgUrl,
        caption: i === 0 ? caption || "TikTok" : undefined,
      }));

      await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

      if (media.length === 1) {
        await bot.sendPhoto(chatId, media[0].media, { caption: media[0].caption });
      } else {
        const chunks = chunkMedia(media);
        for (let i = 0; i < chunks.length; i++) {
          await bot.sendMediaGroup(chatId, chunks[i]);
        }
      }
      return;
    }

    const videoUrl = result.hdplay || result.play;
    if (!videoUrl) {
      await bot.editMessageText("❌ API không trả về link tải video/ảnh.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    await bot.editMessageText("⏳ Đang tải video...", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const buffer = await downloadVideoBuffer(videoUrl);
    if (!buffer || buffer.length === 0) {
      await bot.editMessageText("❌ Tải file thất bại hoặc file quá lớn.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    if (buffer.length > 50 * 1024 * 1024) {
      await bot.sendMessage(chatId, "⚠️ Video quá lớn (>50MB), Telegram không hỗ trợ gửi. Link tải: " + videoUrl);
      return;
    }

    await bot.sendVideo(chatId, buffer, {
      caption: caption || "TikTok",
      supports_streaming: true,
    });
  } catch (err) {
    const errText = err?.message || "Lỗi khi tải video";
    await bot.editMessageText("❌ " + errText, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    }).catch(() => bot.sendMessage(chatId, "❌ " + errText));
  }
}

async function processZmioDownload(bot, chatId, url) {
  const statusMsg = await bot.sendMessage(chatId, "⏳ Đang lấy thông tin...");

  try {
    const result = await fetchAutolink(url);
    if (!result.ok) {
      await bot.editMessageText("❌ " + (result.error || "Không lấy được thông tin."), {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const caption = result.title
      ? `📌 ${result.title}` + (result.author ? ` • @${result.author}` : "")
      : (result.source || "").toUpperCase();

    const imageUrls = getImageUrls(result.medias);
    if (imageUrls.length > 0) {
      await bot.editMessageText("⏳ Đang gửi ảnh...", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      const media = imageUrls.map((imgUrl, i) => ({
        type: "photo",
        media: imgUrl,
        caption: i === 0 ? caption : undefined,
      }));
      await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
      if (media.length === 1) {
        await bot.sendPhoto(chatId, media[0].media, { caption: media[0].caption });
      } else {
        const chunks = chunkMedia(media);
        for (let i = 0; i < chunks.length; i++) {
          await bot.sendMediaGroup(chatId, chunks[i]);
        }
      }
      return;
    }

    const videoUrl = pickBestVideoUrl(result.medias);
    if (!videoUrl) {
      await bot.editMessageText("❌ Không có video để tải.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    await bot.editMessageText("⏳ Đang tải video...", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });

    const buffer = await downloadVideoBuffer(videoUrl);
    if (!buffer || buffer.length === 0) {
      await bot.editMessageText("❌ Tải file thất bại hoặc file quá lớn. Link: " + videoUrl, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    if (buffer.length > 50 * 1024 * 1024) {
      await bot.sendMessage(chatId, "⚠️ Video quá lớn (>50MB). Link tải: " + videoUrl);
      return;
    }

    await bot.sendVideo(chatId, buffer, {
      caption: caption,
      supports_streaming: true,
    });
  } catch (err) {
    const errText = err?.message || "Lỗi khi tải video";
    await bot.editMessageText("❌ " + errText, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    }).catch(() => bot.sendMessage(chatId, "❌ " + errText));
  }
}

async function handleMessage(bot, msg) {
  const text = (msg.text || msg.caption || "").trim();
  const url = extractUrl(text);
  if (!url) return false;

  if (!isSupportedDownloadUrl(url)) return false;
  if (!hasAnyDownloadApi()) return false;

  if (isTikTokUrl(url) && hasApiUrl()) {
    await processTikTokDownload(bot, msg.chat.id, url);
  } else if (hasZmioApiKey()) {
    await processZmioDownload(bot, msg.chat.id, url);
  } else {
    return false;
  }
  return true;
}

module.exports = {
  config,
  execute,
  handleMessage,
};
