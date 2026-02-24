const fs = require("fs");
const path = require("path");

function loadCommands() {
  const commands = {};
  const aliases = {};
  const commandsDir = path.join(__dirname, "../commands");
  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const cmd = require(path.join(commandsDir, file));
    if (cmd.config?.name && typeof cmd.execute === "function") {
      const name = cmd.config.name.toLowerCase();
      commands[name] = cmd;
      
      // Load aliases
      if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
        for (const alias of cmd.config.aliases) {
          aliases[alias.toLowerCase()] = name;
        }
      }
    }
  }
  
  return { commands, aliases };
}

module.exports = { loadCommands };
