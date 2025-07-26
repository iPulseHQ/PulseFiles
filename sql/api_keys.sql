-- Create API Keys table for PulseFiles
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Clerk user ID
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Add RLS (Row Level Security) policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own API keys
CREATE POLICY "Users can access own API keys" ON api_keys
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id);

-- Add created_via column to shared_files table to track API usage
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'web';

-- Create index for tracking API usage
CREATE INDEX IF NOT EXISTS idx_shared_files_created_via ON shared_files(created_via);