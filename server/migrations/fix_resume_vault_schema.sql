-- Fix resume_versions table schema
-- Run this in your Supabase SQL Editor

-- Check if table exists and add missing columns if needed
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS ats_score INTEGER,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES resume_versions(id),
ADD COLUMN IF NOT EXISTS iteration_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL;

-- If the table doesn't exist at all, create it
-- (Run this only if the ALTER TABLE fails with "relation does not exist")

-- CREATE TABLE resume_versions (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID NOT NULL,
--   name TEXT NOT NULL,
--   content TEXT NOT NULL,
--   ats_score INTEGER,
--   parent_id UUID REFERENCES resume_versions(id),
--   iteration_log JSONB DEFAULT '[]'::jsonb,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Enable RLS (Row Level Security)
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own resume versions
CREATE POLICY "Users can view their own resume versions"
ON resume_versions FOR SELECT
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own resume versions
CREATE POLICY "Users can insert their own resume versions"
ON resume_versions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own resume versions
CREATE POLICY "Users can update their own resume versions"
ON resume_versions FOR UPDATE
USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own resume versions
CREATE POLICY "Users can delete their own resume versions"
ON resume_versions FOR DELETE
USING (auth.uid() = user_id);
