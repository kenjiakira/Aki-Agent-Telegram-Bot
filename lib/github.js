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

const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Lấy danh sách Repo Trending từ GitHub
 */
async function getTrendingRepos(language = "", since = "daily") {
  try {
    const url = `https://github.com/trending/${language}?since=${since}`;
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    const repos = [];

    $(".Box-row").each((i, el) => {
      if (i >= 15) return; // Chỉ lấy top 15

      const title = $(el).find("h2 a").text().replace(/\s+/g, "").trim();
      const [owner, name] = title.split("/");
      const description = $(el).find("p").text().trim();
      const stars = $(el).find("a.Link--muted").first().text().trim();
      const link = "https://github.com" + $(el).find("h2 a").attr("href");

      repos.push({ owner, name, title, description, stars, link });
    });

    return repos;
  } catch (error) {
    console.error("Error fetching GitHub Trending:", error);
    return [];
  }
}

module.exports = {
  verifySignature,
  isRelevantEvent,
  extractPullRequest,
  extractIssue,
  parseEvent,
  getTrendingRepos,
  GITHUB_EVENTS,
};
