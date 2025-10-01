-- PulseFiles Migration Script
-- Run this in your Supabase SQL Editor to add all missing columns

-- Add missing columns to shared_files table
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS encrypted_filename TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS filename_salt TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS obfuscated_key TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE shared_files ADD COLUMN IF NOT EXISTS last_download_ip_hash TEXT;

-- Create user profiles table for storing user names
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_email_hash ON shared_files(email_hash);
CREATE INDEX IF NOT EXISTS idx_shared_files_ip_hash ON shared_files(ip_hash);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE user_profiles TO authenticated;

COMMENT ON TABLE user_profiles IS 'User profiles with names and display preferences';
COMMENT ON COLUMN user_profiles.display_name IS 'Generated from first_name + last_name or custom name';