-- Supabase Migration: Aura Atlas Navigation & Profile System
-- Run this in Supabase SQL Editor

-- Mood Journal
CREATE TABLE IF NOT EXISTS mood_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  journal_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mood_journal ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own journal" ON mood_journal
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can see own friendships" ON friendships
    FOR ALL USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own contacts" ON emergency_contacts
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add settings columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS anonymous_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_mood BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mood_visibility TEXT DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Journal Entries upgrades for Mood Journal v2
DO $$
BEGIN
  IF to_regclass('public.journal_entries') IS NOT NULL THEN
    ALTER TABLE public.journal_entries
      ADD COLUMN IF NOT EXISTS intensity INTEGER,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT;

    UPDATE public.journal_entries
      SET intensity = 50
      WHERE intensity IS NULL;

    ALTER TABLE public.journal_entries
      ALTER COLUMN intensity SET DEFAULT 50;

    BEGIN
      ALTER TABLE public.journal_entries
        ADD CONSTRAINT journal_entries_intensity_range
        CHECK (intensity BETWEEN 1 AND 100);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Storage bucket for journal image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-images', 'journal-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Users can upload own journal images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'journal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own journal images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'journal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own journal images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'journal-images'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view journal images" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'journal-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
