-- Migration script cho Supabase
-- Chạy script này trong Supabase SQL Editor để tạo bảng

CREATE TABLE IF NOT EXISTS posted_news (
  id BIGSERIAL PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  content_preview TEXT
);

-- Tạo indexes để tối ưu query
CREATE INDEX IF NOT EXISTS idx_content_hash ON posted_news(content_hash);
CREATE INDEX IF NOT EXISTS idx_posted_at ON posted_news(posted_at DESC);

-- Enable Row Level Security (RLS) nếu cần
-- ALTER TABLE posted_news ENABLE ROW LEVEL SECURITY;

-- Policy để cho phép service role đọc/ghi (nếu dùng RLS)
-- CREATE POLICY "Service role can do everything" ON posted_news
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
