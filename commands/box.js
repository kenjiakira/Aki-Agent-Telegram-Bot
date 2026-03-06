const config = {
  name: "box",
  description: "Xem thông tin nhóm: thành viên, chủ nhóm, admin",
  useBy: 2,
  usePrefix: true,
  category: "general",
};

function isGroup(chat) {
  return chat && (chat.type === "group" || chat.type === "supergroup");
}

function formatUser(member) {
  const u = member.user;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || "—";
  const uname = u.username ? ` @${u.username}` : "";
  return `${name}${uname} (ID: ${u.id})`;
}

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const chat = msg.chat;

  if (!isGroup(chat)) {
    await bot.sendMessage(
      chatId,
      "📌 Lệnh /box chỉ dùng trong group hoặc supergroup để xem thông tin nhóm đó.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  try {
    const [chatInfo, memberCount, admins] = await Promise.all([
      bot.getChat(chatId),
      bot.getChatMemberCount(chatId).catch(() => null),
      bot.getChatAdministrators(chatId),
    ]);

    const title = chatInfo.title || chat.title || "—";
    const typeLabel = chatInfo.type === "supergroup" ? "Supergroup" : "Group";
    const count = memberCount != null ? memberCount : (chatInfo.member_count ?? "—");
    const description = (chatInfo.description || "").trim();

    let text = `📦 Thông tin nhóm\n\n`;
    text += `📌 Tên: ${title}\n`;
    text += `📂 Loại: ${typeLabel}\n`;
    text += `👥 Số thành viên: ${count}\n`;
    if (description) text += `📝 Mô tả: ${description.slice(0, 200)}${description.length > 200 ? "…" : ""}\n`;

    const creators = admins.filter((a) => a.status === "creator");
    const administrators = admins.filter((a) => a.status === "administrator");

    if (creators.length > 0) {
      text += `\n👑 Chủ nhóm (owner):\n`;
      creators.forEach((c) => {
        text += `  • ${formatUser(c)}\n`;
      });
    }
    if (administrators.length > 0) {
      text += `\n🛡 Admin (${administrators.length}):\n`;
      administrators.forEach((a) => {
        const customTitle = a.custom_title ? ` [${a.custom_title}]` : "";
        text += `  • ${formatUser(a)}${customTitle}\n`;
      });
    }
    if (creators.length === 0 && administrators.length === 0) {
      text += "\n_Không lấy được danh sách quản trị._";
    }

    await bot.sendMessage(chatId, text.trim(), { parse_mode: "Markdown" });
  } catch (err) {
    await bot.sendMessage(
      chatId,
      "❌ Không lấy được thông tin nhóm. Bot cần quyền xem thông tin nhóm và danh sách quản trị.\n\nLỗi: " + (err.message || "unknown")
    );
  }
}

module.exports = { config, execute };
