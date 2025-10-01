-- Script om een test download link te maken voor development
-- Run dit in je Supabase SQL editor

-- Maak een test shared file record
INSERT INTO shared_files (
  id,
  file_name,
  file_size,
  file_url,
  title,
  message,
  email,
  expires_at,
  is_folder,
  total_files,
  access_control,
  max_downloads,
  download_count,
  is_active,
  created_at
) VALUES (
  'test-download-link-12345678901234567890123456789012345678901234',
  'test-file.pdf',
  1024000, -- 1MB
  'https://example.com/test-file.pdf',
  'Test Document',
  'This is a test message from the sender. You can see how messages are displayed on the download page.',
  'test@example.com',
  NOW() + INTERVAL '7 days',
  false,
  1,
  'public',
  10,
  0,
  true,
  NOW()
);

-- Test URL: http://localhost:3000/download/test-download-link-12345678901234567890123456789012345678901234

-- Voor een folder test:
INSERT INTO shared_files (
  id,
  file_name,
  file_size,
  file_url,
  title,
  message,
  email,
  expires_at,
  is_folder,
  total_files,
  access_control,
  is_active,
  created_at
) VALUES (
  'test-folder-link-12345678901234567890123456789012345678901234',
  'My Documents',
  5242880, -- 5MB
  'https://example.com/folder/my-documents',
  'Project Files',
  'Here are all the files you requested. Please download them before the link expires!',
  'test@example.com',
  NOW() + INTERVAL '3 days',
  true,
  15,
  'public',
  true,
  NOW()
);

-- Test URL: http://localhost:3000/download/test-folder-link-12345678901234567890123456789012345678901234

-- Voor een password-protected test:
INSERT INTO shared_files (
  id,
  file_name,
  file_size,
  file_url,
  title,
  email,
  expires_at,
  is_folder,
  total_files,
  access_control,
  password_hash,
  is_active,
  created_at
) VALUES (
  'test-password-link-1234567890123456789012345678901234567890123',
  'confidential.pdf',
  2048000, -- 2MB
  'https://example.com/confidential.pdf',
  'Confidential Document',
  'test@example.com',
  NOW() + INTERVAL '7 days',
  false,
  1,
  'password',
  '$2a$10$YourHashedPasswordHere', -- Je moet een echte bcrypt hash gebruiken
  true,
  NOW()
);

-- Test URL: http://localhost:3000/download/test-password-link-1234567890123456789012345678901234567890123

-- Om deze test records te verwijderen:
-- DELETE FROM shared_files WHERE id LIKE 'test-%';
