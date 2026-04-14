const openai = require("./openai");
const deepseek = require("./deepseek");

function normalizeProvider(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "ds" || s === "deepseek") return "deepseek";
  return "openai";
}

function getPrimaryProvider() {
  return normalizeProvider(process.env.LLM_PROVIDER || process.env.AI_LLM_PROVIDER);
}

function fallbackEnabled() {
  const v = String(process.env.LLM_FALLBACK || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function canUseProvider(p) {
  if (p === "deepseek") return !!process.env.DEEPSEEK_API_KEY;
  return !!process.env.OPENAI_API_KEY;
}

function providerLib(p) {
  return p === "deepseek" ? deepseek : openai;
}

function getCallOrder() {
  const primary = getPrimaryProvider();
  const secondary = primary === "openai" ? "deepseek" : "openai";
  const chain = [];
  if (canUseProvider(primary)) chain.push(primary);
  if (fallbackEnabled() && canUseProvider(secondary)) chain.push(secondary);

  if (chain.length > 0) return chain;

  if (canUseProvider(secondary)) {
    console.warn(
      `[llm] LLM_PROVIDER=${primary} nhưng thiếu API key, tạm dùng ${secondary}.`
    );
    return [secondary];
  }
  if (canUseProvider(primary)) return [primary];

  throw new Error("Chưa cấu hình OPENAI_API_KEY hoặc DEEPSEEK_API_KEY.");
}

function getModel() {
  return providerLib(getCallOrder()[0]).getModel();
}

function getApiKey() {
  return providerLib(getCallOrder()[0]).getApiKey();
}

function getClient() {
  return providerLib(getCallOrder()[0]).getClient();
}

async function createResponse(opts) {
  const order = getCallOrder();
  let lastErr;
  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    const lib = providerLib(p);
    const model =
      i === 0 && opts && opts.model != null && String(opts.model).trim() !== ""
        ? opts.model
        : lib.getModel();
    try {
      return await lib.createResponse({ ...opts, model });
    } catch (err) {
      lastErr = err;
      if (i < order.length - 1) {
        console.warn(`[llm] createResponse (${p}) lỗi, thử tiếp:`, err.message);
      }
    }
  }
  throw lastErr;
}

async function createAgentResponse(opts) {
  const order = getCallOrder();
  let lastErr;
  for (let i = 0; i < order.length; i++) {
    const p = order[i];
    const lib = providerLib(p);
    const model =
      i === 0 && opts && opts.model != null && String(opts.model).trim() !== ""
        ? opts.model
        : lib.getModel();
    try {
      return await lib.createAgentResponse({ ...opts, model });
    } catch (err) {
      lastErr = err;
      if (i < order.length - 1) {
        console.warn(`[llm] createAgentResponse (${p}) lỗi, thử tiếp:`, err.message);
      }
    }
  }
  throw lastErr;
}

module.exports = {
  getPrimaryProvider,
  getCallOrder,
  getApiKey,
  getModel,
  getClient,
  createResponse,
  createAgentResponse,
};
