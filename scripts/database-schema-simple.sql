-- Simple database schema without Row Level Security
-- Run this in your Supabase SQL editor

-- Create the shared_files table with all required columns
CREATE TABLE IF NOT EXISTS shared_files (
  id VARCHAR(64) PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  last_download_ip TEXT
);

-- Add missing columns if table already exists (run these individually if needed)
DO $$ 
BEGIN
    -- Add download_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'download_count') THEN
        ALTER TABLE shared_files ADD COLUMN download_count INTEGER DEFAULT 0;
    END IF;

    -- Add last_downloaded_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'last_downloaded_at') THEN
        ALTER TABLE shared_files ADD COLUMN last_downloaded_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add last_download_ip column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'last_download_ip') THEN
        ALTER TABLE shared_files ADD COLUMN last_download_ip TEXT;
    END IF;

    -- Add file_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'file_type') THEN
        ALTER TABLE shared_files ADD COLUMN file_type TEXT;
    END IF;

    -- Add ip_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'ip_address') THEN
        ALTER TABLE shared_files ADD COLUMN ip_address TEXT;
    END IF;

    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shared_files' AND column_name = 'expires_at') THEN
        ALTER TABLE shared_files ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
        -- Set NOT NULL constraint after adding default values
        UPDATE shared_files SET expires_at = (created_at + INTERVAL '7 days') WHERE expires_at IS NULL;
        ALTER TABLE shared_files ALTER COLUMN expires_at SET NOT NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_files_expires_at ON shared_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_files_created_at ON shared_files(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_files_email ON shared_files(email);
CREATE INDEX IF NOT EXISTS idx_shared_files_ip_address ON shared_files(ip_address);

-- View the current table structure to verify
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shared_files' 
ORDER BY ordinal_position;