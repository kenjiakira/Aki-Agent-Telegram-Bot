const crypto = require("crypto");

const GITHUB_EVENTS = {
  PULL_REQUEST: "pull_request",
  ISSUES: "issues",
};

const ACCEPTED_ACTIONS = {
  [GITHUB_EVENTS.PULL_REQUEST]: ["opened"],
  [GITHUB_EVENTS.ISSUES]: ["opened"],
};

/**
 * Xác thực chữ ký webhook GitHub (HMAC SHA256)
 * @param {string} payload - Raw body (string)
 * @param {string} signature - Header X-Hub-Signature-256 (format: "sha256=...")
 * @param {string} secret - GITHUB_WEBHOOK_SECRET
 */
function verifySignature(payload, signature, secret) {
  if (!secret || !signature || !payload) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}

/**
 * Kiểm tra event có phải PR/Issue mới (opened) không
 */
function isRelevantEvent(event, action) {
  const actions = ACCEPTED_ACTIONS[event];
  return actions && actions.includes(action);
}

/**
 * Trích xuất thông tin cần tóm tắt từ PR
 */
function extractPullRequest(payload) {
  const pr = payload?.pull_request;
  if (!pr) return null;
  return {
    type: "pull_request",
    title: pr.title || "",
    body: pr.body || "",
    htmlUrl: pr.html_url || "",
    user: pr.user?.login || "",
    labels: (pr.labels || []).map((l) => l.name),
    base: pr.base?.ref || "",
    head: pr.head?.ref || "",
    repo: payload?.repository?.full_name || "",
  };
}

/**
 * Trích xuất thông tin cần tóm tắt từ Issue
 */
function extractIssue(payload) {
  const issue = payload?.issue;
  if (!issue) return null;
  return {
    type: "issue",
    title: issue.title || "",
    body: issue.body || "",
    htmlUrl: issue.html_url || "",
    user: issue.user?.login || "",
    labels: (issue.labels || []).map((l) => l.name),
    repo: payload?.repository?.full_name || "",
  };
}

/**
 * Parse event và trả về data hoặc null
 */
function parseEvent(event, payload) {
  const action = payload?.action;
  if (!isRelevantEvent(event, action)) return null;
  if (event === GITHUB_EVENTS.PULL_REQUEST) return extractPullRequest(payload);
  if (event === GITHUB_EVENTS.ISSUES) return extractIssue(payload);
  return null;
}

module.exports = {
  verifySignature,
  isRelevantEvent,
  extractPullRequest,
  extractIssue,
  parseEvent,
  GITHUB_EVENTS,
};
