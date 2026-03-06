function parseNewsItems(text) {
  if (!text || typeof text !== "string") return { items: [], fullText: text || "" };

  const trimmed = text.trim();
  let rest = trimmed;
  const firstNum = rest.match(/^\d+\.\s/);
  if (!firstNum && !rest.includes("\n1. ")) return { items: [], fullText: trimmed };
  const from = firstNum ? 0 : rest.indexOf("\n1. ") + 1;
  rest = rest.slice(from);
  const parts = rest.split(/\n(?=\d+\.\s)/m).filter((p) => p.trim());

  const items = [];
  for (const p of parts) {
    const cleaned = p.replace(/^\d+\.\s*/, "").trim();
    if (cleaned) items.push(cleaned);
  }

  if (items.length < 2) return { items: [], fullText: trimmed };

  return { items, fullText: trimmed };
}

function getItemPreview(item, maxLen = 32) {
  const noMarkdown = item
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (noMarkdown.length <= maxLen) return noMarkdown;
  return noMarkdown.slice(0, maxLen - 1) + "…";
}

module.exports = { parseNewsItems, getItemPreview };
