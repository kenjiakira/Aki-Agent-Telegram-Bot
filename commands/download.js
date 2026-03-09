const {
  hasApiUrl,
  extractTikTokUrl,
  fetchVideoInfo,
  downloadVideoBuffer,
} = require("../lib/tiktok");

const config = {
  name: "download",
  description: "Tải video TikTok từ link",
  useBy: 0,
  category: "other",
  aliases: ["tiktok", "tk", "dl"],
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const text = (ctx?.parsed?.rest || msg.text || "").trim();

  if (!hasApiUrl()) {
    await bot.sendMessage(chatId, "❌ API chưa cấu hình trong .env");
    return;
  }

  const url = extractTikTokUrl(text) || extractTikTokUrl(msg.text || "");
  if (!url) {
    await bot.sendMessage(
      chatId,
      "📎 Gửi link TikTok (vd: vm.tiktok.com/..., tiktok.com/@user/video/...) hoặc dùng:\n/download <link>"
    );
    return;
  }

  await processTikTokDownload(bot, chatId, url);
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
        await bot.sendMediaGroup(chatId, media);
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

async function handleMessage(bot, msg) {
  const text = (msg.text || msg.caption || "").trim();
  const url = extractTikTokUrl(text);
  if (!url) return false;

  if (!hasApiUrl()) return false;

  await processTikTokDownload(bot, msg.chat.id, url);
  return true;
}

module.exports = {
  config,
  execute,
  handleMessage,
};
