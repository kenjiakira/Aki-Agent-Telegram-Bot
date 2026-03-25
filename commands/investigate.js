const { getTrendingRepos } = require("../lib/github");
const { DEEP_INVESTIGATOR, TECH_DISCOVERY } = require("../utils/prompts");
const { createResponse, getModel } = require("../lib/openai");

const config = {
  name: "investigate",
  description: "OSINT Tech Investigator: Cào và phân tích công nghệ đa nguồn (GitHub, Reddit, Hacker News...)",
  useBy: 0,
  category: "general",
  usePrefix: true,
  aliases: ["osint", "checktech", "deep"],
  callbacks: ["investigate_"], 
};

async function execute(bot, msg, ctx) {
  const chatId = msg.chat.id;
  const args = ctx.parsed?.args || [];
  const target = args.join(" ").trim();

  if (!target) {
    const statusMsg = await bot.sendMessage(chatId, "🔍 Đang săn lùng công nghệ tiềm năng từ GitHub Trending...");
    const repos = await getTrendingRepos();

    if (repos.length === 0) {
      return bot.editMessageText("❌ Không thể quét dữ liệu Trending lúc này.", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
    }

    const listStr = repos.map(r => `- [${r.title}](${r.link}): ${r.description}`).join("\n");
    
    const discoveryReport = await createResponse({
      model: getModel(),
      instructions: TECH_DISCOVERY.instructions + "\n" + TECH_DISCOVERY.filterCriteria,
      input: [{ role: "user", content: TECH_DISCOVERY.queryFormat + listStr }],
      tools: [{ type: "web_search" }] 
    });

    // Tạo các nút bấm 1-5
    const buttons = [1, 2, 3, 4, 5].map(i => ({ 
      text: `Dự án ${i}`, 
      callback_data: `investigate_${i}` 
    }));

    const inlineKeyboard = {
      inline_keyboard: [buttons]
    };

    let message = "🌟 Discovery Tech Agent: Top 5 Projects\n\n" + discoveryReport + "\n\n";
    message += "Chọn số bên dưới để Deep Investigation hoặc gõ `/investigate [tên tech]`";

    const linkMatches = discoveryReport.match(/\[(.*?)\]\((.*?)\)/g) || [];
    const topFive = repos.slice(0, 5);
    const projects = [0, 1, 2, 3, 4].map((i) => {
      if (linkMatches[i]) return linkMatches[i];
      const r = topFive[i];
      return r ? `[${r.title}](${r.link})` : null;
    }).filter(Boolean);
    ctx.registerReplyContext?.(statusMsg.message_id, { projects });
    
    return bot.editMessageText(message, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: inlineKeyboard,
    });
  }
  return await runDeepInvestigation(bot, chatId, target);
}

async function handleCallback(bot, query, ctx) {
  const chatId = query.message.chat.id;
  const data = query.data; 
  const index = parseInt(data.split("_")[1]) - 1;

  const replyContext = ctx.replyContext || {};
  const projects = replyContext.projects || [];
  const targetProject = projects[index];

  if (!targetProject) {
    return bot.answerCallbackQuery(query.id, { text: "❌ Không tìm thấy thông tin dự án này." });
  }

  const bracket = targetProject.match(/\[(.*?)\]/);
  const projectName = bracket ? bracket[1] : targetProject.replace(/\s+/g, " ").trim();
  
  await bot.answerCallbackQuery(query.id, { text: `Đang điều tra: ${projectName}` });
  return await runDeepInvestigation(bot, chatId, projectName);
}

async function runDeepInvestigation(bot, chatId, target) {
  const statusMsg = await bot.sendMessage(chatId, `🕵️‍♂️ Agent OSINT đang điều tra về: ${target}...`);

  try {
    const osintAnalysis = await createResponse({
      model: getModel(),
      instructions: DEEP_INVESTIGATOR.instructions,
      input: [{ role: "user", content: DEEP_INVESTIGATOR.queryFormat + target }],
      tools: [{ type: "web_search" }] 
    });

    const reportHeader = `📊 KẾT QUẢ ĐIỀU TRA: ${target.toUpperCase()}\n\n`;
    return bot.editMessageText(reportHeader + osintAnalysis, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: "Markdown"
    });
  } catch (error) {
    console.error("OSINT Investigation Error:", error);
    return bot.editMessageText("❌ Hệ thống điều tra gặp sự cố.", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

module.exports = {
  config,
  execute,
  handleCallback,
};
