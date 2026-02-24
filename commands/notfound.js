const { helpKeyboard } = require("../utils/keyboards");

const config = {
  name: "notfound",
  description: "Hiển thị thông báo khi lệnh không tồn tại",
  hide: true,
};

function execute(bot, msg) {
  const chatId = msg.chat.id;
  const text = "❓ Lệnh không tồn tại.\n\n💡 Bấm nút bên dưới để xem hướng dẫn.";
  bot.sendMessage(chatId, text, helpKeyboard);
}

module.exports = { config, execute };
