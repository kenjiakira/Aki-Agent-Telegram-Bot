function getDisplayName(from) {
  if (!from) return "bạn";
  const first = (from.first_name || "").trim();
  const last = (from.last_name || "").trim();
  const username = (from.username || "").trim();

  if (first) return first;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (username) return `@${username}`;
  return "bạn";
}

function getFullName(from) {
  if (!from) return "—";
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  if (name) return from.username ? `${name} (@${from.username})` : name;
  return from.username ? `@${from.username}` : "—";
}

module.exports = {
  getDisplayName,
  getFullName,
};
