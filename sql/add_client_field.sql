-- Add client column to shared_files table to track which client uploaded the file
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS client TEXT;

-- Create index for client field for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_files_client ON shared_files(client);

-- Add comment to explain the field
COMMENT ON COLUMN shared_files.client IS 'Client identifier (e.g., pulseguard) to track which application uploaded the file';
