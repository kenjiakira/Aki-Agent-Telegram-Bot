-- Presets thời gian nhắc theo từng user (chạy trong Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS reminder_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('minutes', 'today', 'tomorrow')),
  value INT,
  hour INT,
  minute INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_reminder_presets_user ON reminder_presets(user_id);
