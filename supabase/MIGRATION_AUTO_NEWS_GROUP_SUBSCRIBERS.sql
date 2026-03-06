CREATE TABLE IF NOT EXISTS auto_news_group_subscribers (
  chat_id TEXT PRIMARY KEY,
  title TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE auto_news_group_subscribers IS 'Group đăng ký nhận tin tự động; mỗi group tối đa 1 bản ghi (chat_id unique).';
