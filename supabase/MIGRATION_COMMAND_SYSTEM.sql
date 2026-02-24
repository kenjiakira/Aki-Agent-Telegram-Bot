-- Migration: Command System Tables
-- Created: 2026-02-24
-- Description: Adds tables for command history and scheduling

-- Table: command_history
-- Stores history of executed commands
CREATE TABLE IF NOT EXISTS command_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  command_name VARCHAR(100) NOT NULL,
  command_text TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_command_history_user_id ON command_history(user_id);
CREATE INDEX IF NOT EXISTS idx_command_history_executed_at ON command_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_history_command_name ON command_history(command_name);

-- Table: scheduled_commands
-- Stores scheduled commands to be executed automatically
CREATE TABLE IF NOT EXISTS scheduled_commands (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  command_name VARCHAR(100) NOT NULL,
  command_text TEXT NOT NULL,
  schedule_time VARCHAR(10) NOT NULL, -- Format: HH:MM (e.g., "09:00")
  schedule_type VARCHAR(20) NOT NULL DEFAULT 'once', -- 'once', 'daily', 'weekly'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_scheduled_commands_user_id ON scheduled_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_commands_enabled ON scheduled_commands(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_commands_schedule_type ON scheduled_commands(schedule_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scheduled_commands_updated_at 
  BEFORE UPDATE ON scheduled_commands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE command_history IS 'Lịch sử các lệnh đã được thực thi';
COMMENT ON TABLE scheduled_commands IS 'Các lệnh được lên lịch tự động chạy';
COMMENT ON COLUMN scheduled_commands.schedule_time IS 'Thời gian chạy theo định dạng HH:MM';
COMMENT ON COLUMN scheduled_commands.schedule_type IS 'Loại lịch: once (một lần), daily (hàng ngày), weekly (hàng tuần)';
