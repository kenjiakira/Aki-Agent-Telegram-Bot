
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCommand(text, prefix = "/") {
  const trimmed = text.trim();
  const re = new RegExp("^" + escapeRegex(prefix) + "(\\w+)");
  const cmdMatch = trimmed.match(re);
  if (!cmdMatch) {
    return null;
  }

  const commandName = cmdMatch[1].toLowerCase();
  const rest = trimmed.substring(cmdMatch[0].length).trim();
  
  const result = {
    name: commandName,
    args: [],
    flags: {},
    raw: text,
  };
  
  const flagRegex = /--(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  const processedRanges = [];
  let match;
  
  while ((match = flagRegex.exec(rest)) !== null) {
    const flagName = match[1];
    const flagValue = match[2] || match[3] || match[4] || true;
    
    result.flags[flagName] = flagValue;
    
    processedRanges.push({
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  const words = [];
  let currentWord = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < rest.length; i++) {
    const char = rest[i];
    const isInProcessedRange = processedRanges.some(range => i >= range.start && i < range.end);
    
    if (isInProcessedRange) {
      continue;
    }
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }
    
    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      continue;
    }
    
    if (char === ' ' && !inQuotes) {
      if (currentWord.trim()) {
        words.push(currentWord.trim());
        currentWord = '';
      }
      continue;
    }
    
    currentWord += char;
  }
  
  if (currentWord.trim()) {
    words.push(currentWord.trim());
  }
  
  for (const word of words) {
    if (word && !word.startsWith('--')) {
      result.args.push(word);
    }
  }
  
  return result;
}

function hasFlag(parsed, flagName) {
  return parsed && parsed.flags && flagName in parsed.flags;
}

function getFlag(parsed, flagName, defaultValue = null) {
  if (!parsed || !parsed.flags) return defaultValue;
  return parsed.flags[flagName] !== undefined ? parsed.flags[flagName] : defaultValue;
}

module.exports = {
  parseCommand,
  hasFlag,
  getFlag,
};
