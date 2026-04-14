const OpenAI = require("openai");

const ENV = {
  API_KEY: process.env.DEEPSEEK_API_KEY,
  DEFAULT_MODEL: process.env.DEEPSEEK_DEFAULT_MODEL || "deepseek-chat",
  BASE_URL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
};

let _client = null;

function getApiKey() {
  return ENV.API_KEY;
}

function getModel() {
  return ENV.DEFAULT_MODEL;
}

function getClient() {
  if (!_client) {
    if (!ENV.API_KEY) throw new Error("DEEPSEEK_API_KEY chưa cấu hình trong .env");
    _client = new OpenAI({
      apiKey: ENV.API_KEY,
      baseURL: ENV.BASE_URL,
    });
  }
  return _client;
}

function contentToString(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content);
  const parts = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "text" && item.text) parts.push(item.text);
    if (item.type === "input_text" && item.text) parts.push(item.text);
  }
  const s = parts.join("\n").trim();
  return s || "(Không có nội dung văn bản; mô hình backup không xử lý ảnh.)";
}

function buildChatMessages({ instructions, input }) {
  const messages = [];
  if (instructions && String(instructions).trim()) {
    messages.push({ role: "system", content: String(instructions).trim() });
  }
  const list = Array.isArray(input) ? input : [{ role: "user", content: String(input) }];
  for (const m of list) {
    if (!m || !m.role) continue;
    const role = m.role === "system" || m.role === "user" || m.role === "assistant" ? m.role : "user";
    messages.push({ role, content: contentToString(m.content) });
  }
  return messages;
}

function normalizeToolsForChat(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  const out = [];
  for (const t of tools) {
    if (!t || typeof t !== "object") continue;
    if (t.type === "web_search") continue;
    if (t.type === "function" && t.function && t.function.name) {
      out.push({ type: "function", function: t.function });
      continue;
    }
    if (t.type === "function" && t.name) {
      out.push({
        type: "function",
        function: {
          name: t.name,
          description: t.description || "",
          parameters: t.parameters || { type: "object", properties: {} },
        },
      });
    }
  }
  return out;
}

async function createResponse({ model, instructions, input, tools }) {
  const client = getClient();
  const messages = buildChatMessages({ instructions, input });
  void tools;

  const completion = await client.chat.completions.create({
    model: model || getModel(),
    messages,
  });
  const text = completion?.choices?.[0]?.message?.content ?? "";
  return String(text).trim();
}

async function createAgentResponse({
  model,
  instructions,
  input,
  tools,
  toolHandler,
  maxIterations = 5,
}) {
  const client = getClient();
  const messages = buildChatMessages({ instructions, input });
  const chatTools = normalizeToolsForChat(tools);
  const useTools = chatTools.length > 0 && typeof toolHandler === "function";

  for (let i = 0; i < maxIterations; i++) {
    const params = {
      model: model || getModel(),
      messages,
    };
    if (useTools) {
      params.tools = chatTools;
      params.tool_choice = "auto";
    }

    const completion = await client.chat.completions.create(params);
    const msg = completion?.choices?.[0]?.message;
    if (!msg) break;

    const toolCalls = msg.tool_calls;
    if (useTools && Array.isArray(toolCalls) && toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content || null,
        tool_calls: toolCalls,
      });
      for (const tc of toolCalls) {
        const name = tc?.function?.name;
        let args = {};
        try {
          args = JSON.parse(tc?.function?.arguments || "{}");
        } catch (_) {
          args = {};
        }
        let toolOutput;
        try {
          toolOutput = name ? await toolHandler(name, args) : "Thiếu tên tool.";
        } catch (err) {
          toolOutput = `Lỗi: ${err?.message || "Không thực thi được tool"}`;
        }
        const outputStr = typeof toolOutput === "object" ? JSON.stringify(toolOutput) : String(toolOutput);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: outputStr,
        });
      }
      continue;
    }

    const text = (msg.content && String(msg.content).trim()) || "";
    if (text) return text;
  }

  return "Xin lỗi, tôi không thể hoàn thành yêu cầu. Vui lòng thử lại.";
}

module.exports = {
  getApiKey,
  getModel,
  getClient,
  createResponse,
  createAgentResponse,
  ENV: Object.freeze({ ...ENV }),
};
