const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_ANON_KEY) phải được cấu hình trong .env"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeContent(content) {
  return content
    .trim()
    .replace(/\s+/g, " ") 
    .replace(/\n\s*\n/g, "\n") 
    .toLowerCase();
}

function createContentHash(content) {
  const crypto = require("crypto");
  const normalized = normalizeContent(content);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function extractUrls(content) {
  const urls = new Set();
  
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const url = match[2].trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const normalizedUrl = normalizeUrl(url);
      urls.add(normalizedUrl);
    }
  }
  
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0].trim();
    const normalizedUrl = normalizeUrl(url);
    urls.add(normalizedUrl);
  }
  
  return Array.from(urls);
}

function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.startsWith("www.")) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    if (urlObj.pathname.endsWith("/") && urlObj.pathname.length > 1) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }
    
    const importantParams = ["id", "slug", "article", "post"];
    const params = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      if (
        importantParams.includes(key.toLowerCase()) ||
        (!key.startsWith("utm_") &&
          !key.startsWith("ref") &&
          !key.startsWith("source") &&
          key !== "fbclid" &&
          key !== "gclid")
      ) {
        params.set(key, value);
      }
    });
    urlObj.search = params.toString();
    
    return urlObj.toString();
  } catch (err) {
    return url;
  }
}

async function hasPostedUrls(urls) {
  if (!urls || urls.length === 0) return false;
  
  for (const url of urls) {
    const { data, error } = await supabase
      .from("posted_news")
      .select("id")
      .contains("urls", [url])
      .limit(1);
    
    if (error && error.code !== "PGRST116") {
      console.error("Error checking URL:", error);
      continue;
    }
    
    if (data && data.length > 0) {
      return true;
    }
  }
  
  return false;
}

async function isAlreadyPosted(content) {
  const hash = createContentHash(content);
  const { data: hashData, error: hashError } = await supabase
    .from("posted_news")
    .select("id")
    .eq("content_hash", hash)
    .single();

  if (hashError && hashError.code !== "PGRST116") {
    throw hashError;
  }

  if (hashData) {
    return true;
  }

  const urls = extractUrls(content);
  if (urls.length > 0) {
    const hasUrls = await hasPostedUrls(urls);
    if (hasUrls) {
      return true;
    }
  }

  return false;
}

async function savePostedNews(content) {
  const hash = createContentHash(content);
  const preview = content.substring(0, 200);
  const urls = extractUrls(content);

  const { data, error } = await supabase.from("posted_news").insert({
    content_hash: hash,
    content_preview: preview,
    urls: urls.length > 0 ? urls : null,
  });

  if (error) {
    if (error.code === "23505") {
      return false;
    }
    throw error;
  }

  return true;
}

async function getPostedUrls(limit = 50) {
  const { data, error } = await supabase
    .from("posted_news")
    .select("urls")
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const allUrls = new Set();
  data.forEach((item) => {
    if (item.urls && Array.isArray(item.urls)) {
      item.urls.forEach((url) => allUrls.add(url));
    }
  });

  return Array.from(allUrls);
}

async function getPostedNews(limit = 10) {
  const { data, error } = await supabase
    .from("posted_news")
    .select("id, content_preview, posted_at, urls")
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

async function cleanupOldNews(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffISO = cutoffDate.toISOString();

  const { data, error } = await supabase
    .from("posted_news")
    .delete()
    .lt("posted_at", cutoffISO)
    .select();

  if (error) {
    throw error;
  }

  return data?.length || 0;
}

/**
 * Command History Functions
 */
async function saveCommandHistory(userId, commandName, commandText, success = true, error = null) {
  const { data, error: dbError } = await supabase
    .from("command_history")
    .insert({
      user_id: userId,
      command_name: commandName,
      command_text: commandText,
      success: success,
      error_message: error,
      executed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    console.error("Error saving command history:", dbError);
    return null;
  }

  return data;
}

async function getCommandHistory(userId = null, limit = 20) {
  let query = supabase
    .from("command_history")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Command Scheduling Functions
 */
async function saveScheduledCommand(userId, commandName, commandText, scheduleTime, scheduleType = "once", enabled = true) {
  const { data, error } = await supabase
    .from("scheduled_commands")
    .insert({
      user_id: userId,
      command_name: commandName,
      command_text: commandText,
      schedule_time: scheduleTime,
      schedule_type: scheduleType, // 'once', 'daily', 'weekly'
      enabled: enabled,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getScheduledCommands(userId = null, enabledOnly = false) {
  let query = supabase
    .from("scheduled_commands")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (enabledOnly) {
    query = query.eq("enabled", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

async function deleteScheduledCommand(scheduleId) {
  const { data, error } = await supabase
    .from("scheduled_commands")
    .delete()
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateScheduledCommand(scheduleId, updates) {
  const { data, error } = await supabase
    .from("scheduled_commands")
    .update(updates)
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

const ALLOWED_IDS_ENV = process.env.ALLOWED_USER_IDS
  ? process.env.ALLOWED_USER_IDS.split(",").map((id) => id.trim()).filter(Boolean)
  : [];
const ADMIN_IDS_ENV = process.env.ADMIN_USER_IDS
  ? process.env.ADMIN_USER_IDS.split(",").map((id) => id.trim()).filter(Boolean)
  : [];

async function getBotUser(telegramId) {
  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertBotUser(telegramId, profile = {}) {
  const existing = await getBotUser(telegramId);
  const isAdminEnv = ADMIN_IDS_ENV.includes(String(telegramId));
  const defaultAllowed = ALLOWED_IDS_ENV.length === 0;

  const row = {
    telegram_id: telegramId,
    username: profile.username ?? existing?.username ?? null,
    first_name: profile.first_name ?? existing?.first_name ?? null,
    last_name: profile.last_name ?? existing?.last_name ?? null,
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    row.role = isAdminEnv ? "admin" : "user";
    row.allowed = defaultAllowed;
    row.created_at = row.updated_at;
    const { data, error } = await supabase.from("bot_users").insert(row).select().single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("bot_users")
    .update(row)
    .eq("telegram_id", telegramId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateBotUser(telegramId, updates) {
  const allowed = ["role", "allowed", "username", "first_name", "last_name"];
  const body = {};
  for (const k of allowed) {
    if (updates[k] !== undefined) body[k] = updates[k];
  }
  if (Object.keys(body).length === 0) return getBotUser(telegramId);

  const { data, error } = await supabase
    .from("bot_users")
    .update(body)
    .eq("telegram_id", telegramId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getBotUsers(options = {}) {
  const { limit = 50, role = null, allowed = null } = options;
  let query = supabase
    .from("bot_users")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (role) query = query.eq("role", role);
  if (allowed !== null) query = query.eq("allowed", !!allowed);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getPermission(telegramId) {
  const user = await getBotUser(telegramId);
  if (user) {
    return {
      allowed: user.allowed,
      isAdmin: user.role === "admin",
    };
  }
  return {
    allowed: ALLOWED_IDS_ENV.length === 0 || ALLOWED_IDS_ENV.includes(String(telegramId)),
    isAdmin: ADMIN_IDS_ENV.includes(String(telegramId)),
  };
}

async function addAutoNewsSubscriber(telegramId) {
  const { error } = await supabase
    .from("auto_news_subscribers")
    .upsert({ telegram_id: String(telegramId) }, { onConflict: "telegram_id" });
  if (error) throw error;
}

async function removeAutoNewsSubscriber(telegramId) {
  const { error } = await supabase
    .from("auto_news_subscribers")
    .delete()
    .eq("telegram_id", String(telegramId));
  if (error) throw error;
}

async function isAutoNewsSubscriber(telegramId) {
  const { data, error } = await supabase
    .from("auto_news_subscribers")
    .select("telegram_id")
    .eq("telegram_id", String(telegramId))
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function getAutoNewsSubscriberIds() {
  const { data: subs, error: subError } = await supabase
    .from("auto_news_subscribers")
    .select("telegram_id");
  if (subError) throw subError;
  if (!subs?.length) return [];

  const ids = subs.map((r) => r.telegram_id);
  const { data: users, error: userError } = await supabase
    .from("bot_users")
    .select("telegram_id")
    .in("telegram_id", ids)
    .eq("allowed", true);
  if (userError) throw userError;

  const allowedSet = new Set((users || []).map((u) => String(u.telegram_id)));
  return ids.filter((id) => allowedSet.has(String(id)));
}

module.exports = {
  isAlreadyPosted,
  savePostedNews,
  getPostedNews,
  getPostedUrls,
  cleanupOldNews,
  extractUrls,
  normalizeUrl,
  supabase,
  saveCommandHistory,
  getCommandHistory,
  saveScheduledCommand,
  getScheduledCommands,
  deleteScheduledCommand,
  updateScheduledCommand,
  // Bot users
  getBotUser,
  upsertBotUser,
  updateBotUser,
  getBotUsers,
  getPermission,
  addAutoNewsSubscriber,
  removeAutoNewsSubscriber,
  isAutoNewsSubscriber,
  getAutoNewsSubscriberIds,
};
