-- Voice Journals Migration: Living Book AI Therapist
-- Run this in Supabase SQL Editor

-- 1. Voice journals table
CREATE TABLE IF NOT EXISTS voice_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  mood TEXT,
  smile_score INTEGER DEFAULT 50,
  duration_seconds INTEGER DEFAULT 0,
  is_vaulted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE voice_journals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own voice journals" ON voice_journals
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add vault_pin column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vault_pin TEXT;

-- 3. Storage bucket for voice journals
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-journals', 'voice-journals', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Users can upload own voice journals" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'voice-journals'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can read own voice journals" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'voice-journals'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own voice journals" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'voice-journals'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
