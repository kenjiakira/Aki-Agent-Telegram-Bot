const OpenAI = require("openai");

const ENV = {
  API_KEY: process.env.OPENAI_API_KEY,
  DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL || "gpt-4.1-mini",
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
    if (!ENV.API_KEY) throw new Error("OPENAI_API_KEY chưa cấu hình trong .env");
    _client = new OpenAI({ apiKey: ENV.API_KEY });
  }
  return _client;
}

async function createResponse({ model, instructions, input, tools }) {
  const client = getClient();
  const response = await client.responses.create({
    model: model || getModel(),
    input,
    tools: tools || [{ type: "web_search" }],
    instructions,
  });

  const raw =
    response?.output_text ??
    (response?.output ?? [])
      ?.map((item) =>
        (item?.content ?? [])
          ?.map((c) => c?.text ?? c?.content ?? "")
          ?.join("")
      )
      ?.join("") ??
    "";

  return raw.trim();
}

async function createAgentResponse({ model, instructions, input, tools, toolHandler, maxIterations = 5 }) {
  const client = getClient();
  let currentInput = Array.isArray(input) ? [...input] : [{ role: "user", content: String(input) }];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.responses.create({
      model: model || getModel(),
      input: currentInput,
      tools: tools || [],
      instructions: instructions || "",
    });

    const output = response?.output ?? [];
    const outputText = response?.output_text ?? "";

    currentInput = currentInput.concat(output);

    for (const item of output) {
      const type = item?.type || item?.kind;
      if (type === "function_call") {
        const name = item.name;
        const callId = item.call_id;
        let args = {};
        try {
          args = typeof item.arguments === "string" ? JSON.parse(item.arguments) : (item.arguments || {});
        } catch (_) {
          args = {};
        }
        let toolOutput;
        try {
          toolOutput = await toolHandler(name, args);
        } catch (err) {
          toolOutput = `Lỗi: ${err?.message || "Không thực thi được tool"}`;
        }
        const outputStr = typeof toolOutput === "object" ? JSON.stringify(toolOutput) : String(toolOutput);
        currentInput.push({
          type: "function_call_output",
          call_id: callId,
          output: outputStr,
        });
      }
    }

    if (outputText && outputText.trim().length > 0) {
      return outputText.trim();
    }

    const hasMoreCalls = output.some((it) => (it?.type || it?.kind) === "function_call");
    if (!hasMoreCalls) {
      const text = output
        ?.map((it) => {
          const c = it?.content ?? [];
          return (Array.isArray(c) ? c : [c])
            .map((x) => x?.text ?? x?.content ?? "")
            .filter(Boolean)
            .join("");
        })
        .filter(Boolean)
        .join("");
      if (text && text.trim()) return text.trim();
    }
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
