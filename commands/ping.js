const config = {
  name: "ping",
  description: "Kiểm tra thời gian phản hồi của bot",
  useBy: 0,
  category: "general",
};

function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const start = ctx?.pingStart ?? Date.now();
  const ms = Math.round(Date.now() - start);
  const text = `🏓 Pong!\n\n⏱ ${ms} ms`;
  bot.sendMessage(chatId, text);
}

module.exports = { config, execute };
