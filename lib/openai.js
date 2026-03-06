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

module.exports = {
  getApiKey,
  getModel,
  getClient,
  createResponse,
  ENV: Object.freeze({ ...ENV }),
};
