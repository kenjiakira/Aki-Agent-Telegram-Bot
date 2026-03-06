const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function time() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function createLogger(scope, color = COLORS.cyan) {
  const prefix = `${COLORS.dim}[${time()}]${COLORS.reset} ${color}[${scope}]${COLORS.reset}`;
  return {
    log(...args) {
      console.log(prefix, ...args);
    },
    info(...args) {
      console.log(prefix, COLORS.green + "ℹ" + COLORS.reset, ...args);
    },
    warn(...args) {
      console.warn(prefix, COLORS.yellow + "⚠" + COLORS.reset, ...args);
    },
    error(...args) {
      console.error(prefix, COLORS.red + "✖" + COLORS.reset, ...args);
    },
    ok(...args) {
      console.log(prefix, COLORS.green + "✓" + COLORS.reset, ...args);
    },
  };
}

function printBanner(appName, version, mode) {
  const w = 44;
  const line = "═".repeat(w);
  const title = `${appName}  v${version}`.slice(0, w - 4);
  const modeLine = ` mode: ${mode}`.padEnd(w - 2);
  console.log(COLORS.cyan + "╔" + line + "╗" + COLORS.reset);
  console.log(COLORS.cyan + "║" + COLORS.reset + COLORS.magenta + " " + title.padEnd(w - 2) + COLORS.reset + COLORS.cyan + " ║" + COLORS.reset);
  console.log(COLORS.cyan + "║" + COLORS.reset + COLORS.dim + " " + modeLine + COLORS.reset + COLORS.cyan + " ║" + COLORS.reset);
  console.log(COLORS.cyan + "╚" + line + "╝" + COLORS.reset);
}

module.exports = { createLogger, printBanner, COLORS };
