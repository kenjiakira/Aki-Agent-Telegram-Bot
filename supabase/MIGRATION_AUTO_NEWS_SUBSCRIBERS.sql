-- Migration: Auto News Subscribers
-- Description: Bảng lưu user đăng ký nhận tin tự động mỗi ngày 8:00 (gửi vào tin nhắn riêng).
-- Chạy trong Supabase: SQL Editor → New query → paste → Run.

CREATE TABLE IF NOT EXISTS auto_news_subscribers (
  telegram_id TEXT PRIMARY KEY
);

-- Gợi ý: enable RLS nếu dùng Row Level Security (chỉ service role ghi/đọc).
-- ALTER TABLE auto_news_subscribers ENABLE ROW LEVEL SECURITY;
