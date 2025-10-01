-- Migration script for enhanced PulseFiles features
-- Run this script in your Supabase SQL editor

-- Add new columns to shared_files table for enhanced features
ALTER TABLE shared_files 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS recipients TEXT[], -- Array of email addresses (max 3)
ADD COLUMN IF NOT EXISTS password_hash TEXT, -- Bcrypt hash for password protection
ADD COLUMN IF NOT EXISTS password_salt TEXT, -- Salt for password hashing
ADD COLUMN IF NOT EXISTS access_control VARCHAR(20) DEFAULT 'public' CHECK (access_control IN ('public', 'password', 'authenticated')),
ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE, -- Indicates if this is a folder upload
ADD COLUMN IF NOT EXISTS folder_name TEXT, -- Original folder name for folder uploads
ADD COLUMN IF NOT EXISTS total_files INTEGER DEFAULT 1, -- Number of files in folder (1 for single files)
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE, -- For soft delete/deactivation
ADD COLUMN IF NOT EXISTS max_downloads INTEGER, -- Limit number of downloads (NULL = unlimited)
ADD COLUMN IF NOT EXISTS download_limit_reached BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_files_access_control ON shared_files(access_control);
CREATE INDEX IF NOT EXISTS idx_shared_files_is_folder ON shared_files(is_folder);
CREATE INDEX IF NOT EXISTS idx_shared_files_is_active ON shared_files(is_active);
CREATE INDEX IF NOT EXISTS idx_shared_files_recipients ON shared_files USING GIN(recipients);

-- Create table for tracking individual file access (for detailed analytics)
CREATE TABLE IF NOT EXISTS file_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shared_file_id TEXT NOT NULL REFERENCES shared_files(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    ip_hash TEXT,
    user_agent TEXT,
    download_successful BOOLEAN DEFAULT TRUE,
    access_method VARCHAR(20) DEFAULT 'direct' CHECK (access_method IN ('direct', 'password', 'authenticated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for access logs
CREATE INDEX IF NOT EXISTS idx_file_access_logs_shared_file_id ON file_access_logs(shared_file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_accessed_at ON file_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_ip_hash ON file_access_logs(ip_hash);

-- Create table for folder contents (when uploading folders)
CREATE TABLE IF NOT EXISTS folder_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shared_file_id TEXT NOT NULL REFERENCES shared_files(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, -- Relative path within the folder
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    s3_key TEXT NOT NULL, -- Individual S3 key for this file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for folder contents
CREATE INDEX IF NOT EXISTS idx_folder_contents_shared_file_id ON folder_contents(shared_file_id);
CREATE INDEX IF NOT EXISTS idx_folder_contents_file_path ON folder_contents(file_path);

-- Create function to update download count and check limits
CREATE OR REPLACE FUNCTION increment_download_count(file_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_count INTEGER;
BEGIN
    -- Get current download count and max downloads
    SELECT download_count, max_downloads 
    INTO current_count, max_count
    FROM shared_files 
    WHERE id = file_id AND is_active = TRUE;
    
    -- Check if file exists and is active
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if download limit is reached
    IF max_count IS NOT NULL AND current_count >= max_count THEN
        UPDATE shared_files 
        SET download_limit_reached = TRUE 
        WHERE id = file_id;
        RETURN FALSE;
    END IF;
    
    -- Increment download count
    UPDATE shared_files 
    SET 
        download_count = download_count + 1,
        download_limit_reached = CASE 
            WHEN max_count IS NOT NULL AND download_count + 1 >= max_count THEN TRUE 
            ELSE FALSE 
        END
    WHERE id = file_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to log file access
CREATE OR REPLACE FUNCTION log_file_access(
    file_id TEXT,
    ip_addr TEXT DEFAULT NULL,
    ip_hash_val TEXT DEFAULT NULL,
    user_agent_val TEXT DEFAULT NULL,
    success BOOLEAN DEFAULT TRUE,
    method VARCHAR(20) DEFAULT 'direct'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO file_access_logs (
        shared_file_id,
        ip_address,
        ip_hash,
        user_agent,
        download_successful,
        access_method
    ) VALUES (
        file_id,
        ip_addr,
        ip_hash_val,
        user_agent_val,
        success,
        method
    );
END;
$$ LANGUAGE plpgsql;

-- Add RLS (Row Level Security) policies if not already enabled
ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_contents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active shared files" ON shared_files;
DROP POLICY IF EXISTS "Users can manage their own files" ON shared_files;
DROP POLICY IF EXISTS "Allow logging file access" ON file_access_logs;
DROP POLICY IF EXISTS "Users can view logs for their files" ON file_access_logs;
DROP POLICY IF EXISTS "Public can view active folder contents" ON folder_contents;
DROP POLICY IF EXISTS "Users can manage their own folder contents" ON folder_contents;

-- Policy for shared_files: Allow public read for active files, authenticated users can manage their own
CREATE POLICY "Public can view active shared files" ON shared_files
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can manage their own files" ON shared_files
    FOR ALL USING (auth.uid() = user_id);

-- Policy for file_access_logs: Only allow inserts and users can view their own file logs
CREATE POLICY "Allow logging file access" ON file_access_logs
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view logs for their files" ON file_access_logs
    FOR SELECT USING (
        shared_file_id IN (
            SELECT id FROM shared_files WHERE user_id = auth.uid()
        )
    );

-- Policy for folder_contents: Same as shared_files
CREATE POLICY "Public can view active folder contents" ON folder_contents
    FOR SELECT USING (
        shared_file_id IN (
            SELECT id FROM shared_files WHERE is_active = TRUE
        )
    );

CREATE POLICY "Users can manage their own folder contents" ON folder_contents
    FOR ALL USING (
        shared_file_id IN (
            SELECT id FROM shared_files WHERE user_id = auth.uid()
        )
    );

-- Update existing records to have default values for new columns
UPDATE shared_files 
SET 
    access_control = 'public',
    is_folder = FALSE,
    total_files = 1,
    is_active = TRUE,
    download_limit_reached = FALSE
WHERE access_control IS NULL;

-- Create view for file statistics (useful for admin/analytics)
CREATE OR REPLACE VIEW file_statistics AS
SELECT 
    sf.id,
    sf.file_name,
    sf.folder_name,
    sf.is_folder,
    sf.total_files,
    sf.file_size,
    sf.access_control,
    sf.download_count,
    sf.max_downloads,
    sf.download_limit_reached,
    sf.created_at,
    sf.expires_at,
    sf.is_active,
    COALESCE(array_length(sf.recipients, 1), 0) as recipient_count,
    (
        SELECT COUNT(*) 
        FROM file_access_logs fal 
        WHERE fal.shared_file_id = sf.id
    ) as total_access_attempts,
    (
        SELECT COUNT(*) 
        FROM file_access_logs fal 
        WHERE fal.shared_file_id = sf.id AND fal.download_successful = TRUE
    ) as successful_downloads
FROM shared_files sf;

COMMENT ON TABLE shared_files IS 'Enhanced shared files table with folder support, multiple recipients, password protection, and access control';
COMMENT ON TABLE file_access_logs IS 'Detailed logging of file access attempts for analytics and security';
COMMENT ON TABLE folder_contents IS 'Individual files within uploaded folders';
COMMENT ON VIEW file_statistics IS 'Comprehensive statistics view for shared files including access metrics';

-- Grant necessary permissions
GRANT SELECT ON file_statistics TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_download_count(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_file_access(TEXT, TEXT, TEXT, TEXT, BOOLEAN, VARCHAR) TO authenticated, anon;