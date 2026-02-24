-- Migration v2: Thêm cột urls để check duplicate theo URL
-- Chạy script này trong Supabase SQL Editor để cập nhật bảng

-- Thêm cột urls (lưu array các URLs)
ALTER TABLE posted_news 
ADD COLUMN IF NOT EXISTS urls TEXT[];

-- Tạo index cho urls để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_posted_news_urls ON posted_news USING GIN(urls);

-- Function để check URL đã tồn tại (helper)
CREATE OR REPLACE FUNCTION url_exists(check_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM posted_news 
    WHERE urls IS NOT NULL 
    AND check_url = ANY(urls)
  );
END;
$$ LANGUAGE plpgsql;

-- Cập nhật các records cũ (nếu có) - extract URLs từ content_preview
-- Note: Chạy migration này sau khi đã có data, có thể skip nếu chưa có data
