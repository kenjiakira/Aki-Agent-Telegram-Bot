-- Migration: Bot Users (User Management)
-- Description: Bảng quản lý người dùng bot — quyền (allowed), vai trò (admin/user), đồng bộ từ Telegram.

-- Table: bot_users
CREATE TABLE IF NOT EXISTS bot_users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_users_role ON bot_users(role);
CREATE INDEX IF NOT EXISTS idx_bot_users_allowed ON bot_users(allowed);
CREATE INDEX IF NOT EXISTS idx_bot_users_updated_at ON bot_users(updated_at DESC);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_bot_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bot_users_updated_at ON bot_users;
CREATE TRIGGER trigger_bot_users_updated_at
  BEFORE UPDATE ON bot_users
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_users_updated_at();

COMMENT ON TABLE bot_users IS 'Người dùng bot: quyền truy cập (allowed) và vai trò (admin/user)';
COMMENT ON COLUMN bot_users.telegram_id IS 'Telegram user ID';
COMMENT ON COLUMN bot_users.role IS 'user hoặc admin';
COMMENT ON COLUMN bot_users.allowed IS 'true = được dùng bot, false = bị chặn';
