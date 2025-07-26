-- Migration to add Clerk user_id support
-- Run this in your Supabase SQL editor

-- Add user_id column as TEXT to support Clerk user IDs
ALTER TABLE shared_files 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shared_files' AND column_name = 'user_id';