-- Fix user_id column to support Clerk user IDs
-- Run this in your Supabase SQL editor

-- First, check if user_id column exists and its type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shared_files' AND column_name = 'user_id';

-- Drop the existing user_id column if it exists and is UUID type
DO $$ 
BEGIN
    -- Check if column exists and is UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shared_files' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop the UUID user_id column
        ALTER TABLE shared_files DROP COLUMN user_id;
        RAISE NOTICE 'Dropped UUID user_id column';
    END IF;
END $$;

-- Add user_id column as TEXT to support Clerk user IDs
ALTER TABLE shared_files 
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);

-- Verify the column was added correctly
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shared_files' AND column_name = 'user_id';