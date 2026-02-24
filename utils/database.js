const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_ANON_KEY) phải được cấu hình trong .env"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

function createContentHash(content) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

async function isAlreadyPosted(content) {
  const hash = createContentHash(content);
  const { data, error } = await supabase
    .from("posted_news")
    .select("id")
    .eq("content_hash", hash)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return !!data;
}

async function savePostedNews(content) {
  const hash = createContentHash(content);
  const preview = content.substring(0, 200);

  const { data, error } = await supabase.from("posted_news").insert({
    content_hash: hash,
    content_preview: preview,
  });

  if (error) {
    if (error.code === "23505") {
      return false;
    }
    throw error;
  }

  return true;
}

async function getPostedNews(limit = 10) {
  const { data, error } = await supabase
    .from("posted_news")
    .select("id, content_preview, posted_at")
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

module.exports = {
  isAlreadyPosted,
  savePostedNews,
  getPostedNews,
  cleanupOldNews,
  supabase,
};
