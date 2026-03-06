const path = require("path");
const { printBanner } = require("./utils/logger");

let appName = "Bot Tele";
let version = "1.0.0";
try {
  const pkg = require(path.join(__dirname, "package.json"));
  if (pkg.name) appName = pkg.name;
  if (pkg.version) version = pkg.version;
} catch {
}

const mode = process.env.USE_WEBHOOK === "true" && process.env.WEBHOOK_URL ? "webhook" : "polling";
printBanner(appName, version, mode);
require("./main");
