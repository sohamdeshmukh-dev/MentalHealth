-- Supabase Migration: MentalMap Navigation & Profile System
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
