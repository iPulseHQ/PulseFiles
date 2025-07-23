-- Enhanced OpenFiles Database Schema with Encryption Support

-- Create the shared_files table with encryption fields
CREATE TABLE IF NOT EXISTS shared_files (
  id VARCHAR(64) PRIMARY KEY,
  
  -- User association (optional - for logged in users)
  user_id UUID REFERENCES auth.users(id),
  
  -- Original filename (now encrypted)
  file_name TEXT NOT NULL,
  encrypted_filename TEXT,
  filename_salt TEXT,
  
  -- File storage information
  file_url TEXT NOT NULL,
  obfuscated_key TEXT, -- Obfuscated S3 storage key
  file_size BIGINT NOT NULL,
  file_type TEXT,
  
  -- User information (now hashed for privacy)
  email TEXT NOT NULL,
  email_hash TEXT,
  
  -- Timestamps
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Security and tracking (now hashed)
  ip_address TEXT,
  ip_hash TEXT,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  last_download_ip TEXT,
  last_download_ip_hash TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_files_expires_at ON shared_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_files_created_at ON shared_files(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_email_hash ON shared_files(email_hash);
CREATE INDEX IF NOT EXISTS idx_shared_files_ip_hash ON shared_files(ip_hash);

-- Migration script to add new columns to existing table
-- Run this if you already have a shared_files table
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS encrypted_filename TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS filename_salt TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS obfuscated_key TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS last_download_ip_hash TEXT;

-- Create new indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_email_hash ON shared_files(email_hash);
CREATE INDEX IF NOT EXISTS idx_shared_files_ip_hash ON shared_files(ip_hash);

-- Enable RLS if using Supabase
-- ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;

-- Example policies for Supabase (uncomment if needed)
-- CREATE POLICY "Anyone can insert file records" ON shared_files
--   FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Anyone can select file records by ID" ON shared_files
--   FOR SELECT USING (true);