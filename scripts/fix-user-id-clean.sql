-- Fix user_id column to support Clerk user IDs (clean approach)
-- Run this in your Supabase SQL editor

-- First, check if user_id column exists and its type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shared_files' AND column_name = 'user_id';

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view active shared files" ON shared_files;
DROP POLICY IF EXISTS "Users can manage their own files" ON shared_files;
DROP POLICY IF EXISTS "Allow file management" ON shared_files;
DROP POLICY IF EXISTS "Allow logging file access" ON file_access_logs;
DROP POLICY IF EXISTS "Users can view logs for their files" ON file_access_logs;
DROP POLICY IF EXISTS "Public can view active folder contents" ON folder_contents;
DROP POLICY IF EXISTS "Public can view folder contents" ON folder_contents;
DROP POLICY IF EXISTS "Users can manage their own folder contents" ON folder_contents;

-- Now drop the existing user_id column if it exists and is UUID type
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

-- Create simple policies that work with Clerk authentication
-- These are more permissive since authentication is handled by Clerk

-- Allow public read access to shared files
CREATE POLICY "public_read_shared_files" ON shared_files
    FOR SELECT USING (TRUE);

-- Allow all operations on shared files (since auth is handled by Clerk)
CREATE POLICY "allow_all_shared_files" ON shared_files
    FOR ALL USING (TRUE);

-- Allow logging file access
CREATE POLICY "allow_file_access_logging" ON file_access_logs
    FOR INSERT WITH CHECK (TRUE);

-- Allow read access to file access logs
CREATE POLICY "public_read_access_logs" ON file_access_logs
    FOR SELECT USING (TRUE);

-- Allow read access to folder contents
CREATE POLICY "public_read_folder_contents" ON folder_contents
    FOR SELECT USING (TRUE);

-- Allow all operations on folder contents
CREATE POLICY "allow_all_folder_contents" ON folder_contents
    FOR ALL USING (TRUE);

-- Verify the column was added correctly
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shared_files' AND column_name = 'user_id';