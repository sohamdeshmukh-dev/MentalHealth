-- College Integration Migration
-- Run in Supabase SQL editor after existing migrations.

-- 1) Colleges catalog limited to the 11 supported cities
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  campus_radius DOUBLE PRECISION NOT NULL DEFAULT 1.6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, city),
  CONSTRAINT colleges_supported_city_check CHECK (
    city = ANY (
      ARRAY[
        'New York City',
        'Los Angeles',
        'Chicago',
        'Houston',
        'Phoenix',
        'Philadelphia',
        'San Antonio',
        'San Diego',
        'Dallas',
        'Jacksonville',
        'Charlottesville'
      ]::TEXT[]
    )
  )
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Anyone can read colleges" ON public.colleges
    FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS colleges_city_idx ON public.colleges(city);

-- 2) Link profiles to colleges
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS college_id UUID,
  ADD COLUMN IF NOT EXISTS city TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_college_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_college_id_fkey
      FOREIGN KEY (college_id)
      REFERENCES public.colleges(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_college_id_idx ON public.profiles(college_id);

-- 3) Link checkins to users + colleges for campus aggregation
DO $$
BEGIN
  IF to_regclass('public.checkins') IS NOT NULL THEN
    ALTER TABLE public.checkins
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS college_id UUID,
      ADD COLUMN IF NOT EXISTS campus_name TEXT;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'checkins_user_id_fkey'
    ) THEN
      ALTER TABLE public.checkins
        ADD CONSTRAINT checkins_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'checkins_college_id_fkey'
    ) THEN
      ALTER TABLE public.checkins
        ADD CONSTRAINT checkins_college_id_fkey
        FOREIGN KEY (college_id)
        REFERENCES public.colleges(id)
        ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS checkins_college_id_idx ON public.checkins(college_id);
    CREATE INDEX IF NOT EXISTS checkins_user_id_idx ON public.checkins(user_id);
  END IF;
END $$;

-- 4) Seed colleges in supported cities
INSERT INTO public.colleges (name, city, latitude, longitude, campus_radius)
VALUES
  ('Columbia University', 'New York City', 40.8075, -73.9626, 1.8),
  ('New York University', 'New York City', 40.7295, -73.9965, 1.5),
  ('City College of New York', 'New York City', 40.8198, -73.9492, 1.2),

  ('University of California, Los Angeles', 'Los Angeles', 34.0689, -118.4452, 2.0),
  ('University of Southern California', 'Los Angeles', 34.0224, -118.2851, 1.7),
  ('Loyola Marymount University', 'Los Angeles', 33.9701, -118.4165, 1.3),

  ('University of Chicago', 'Chicago', 41.7886, -87.5987, 1.8),
  ('University of Illinois Chicago', 'Chicago', 41.8708, -87.6505, 1.6),
  ('Northwestern University', 'Chicago', 42.0565, -87.6753, 1.9),

  ('Rice University', 'Houston', 29.7174, -95.4018, 1.7),
  ('University of Houston', 'Houston', 29.7199, -95.3422, 1.8),
  ('Texas Southern University', 'Houston', 29.7211, -95.3590, 1.4),

  ('Arizona State University - Downtown Phoenix', 'Phoenix', 33.4534, -112.0738, 1.5),
  ('Grand Canyon University', 'Phoenix', 33.5122, -112.1299, 1.7),
  ('University of Arizona College of Medicine - Phoenix', 'Phoenix', 33.4652, -112.0736, 1.2),

  ('University of Pennsylvania', 'Philadelphia', 39.9522, -75.1932, 1.7),
  ('Drexel University', 'Philadelphia', 39.9566, -75.1899, 1.5),
  ('Temple University', 'Philadelphia', 39.9812, -75.1553, 1.6),

  ('The University of Texas at San Antonio', 'San Antonio', 29.5849, -98.6177, 2.0),
  ('Trinity University', 'San Antonio', 29.4633, -98.4826, 1.3),
  ('St. Mary''s University', 'San Antonio', 29.4256, -98.5418, 1.2),

  ('University of California San Diego', 'San Diego', 32.8801, -117.2340, 2.2),
  ('San Diego State University', 'San Diego', 32.7757, -117.0716, 1.8),
  ('University of San Diego', 'San Diego', 32.7719, -117.1887, 1.3),

  ('Southern Methodist University', 'Dallas', 32.8426, -96.7848, 1.6),
  ('The University of Texas at Dallas', 'Dallas', 32.9858, -96.7501, 1.8),
  ('Dallas Baptist University', 'Dallas', 32.7073, -96.9452, 1.4),

  ('University of North Florida', 'Jacksonville', 30.2699, -81.5072, 1.9),
  ('Jacksonville University', 'Jacksonville', 30.3504, -81.6031, 1.4),
  ('Edward Waters University', 'Jacksonville', 30.3333, -81.6931, 1.2),

  ('University of Virginia', 'Charlottesville', 38.0356, -78.5034, 1.8),
  ('Piedmont Virginia Community College', 'Charlottesville', 38.0246, -78.4369, 1.1),
  ('University of Virginia School of Law', 'Charlottesville', 38.0500, -78.5074, 1.0)
ON CONFLICT (name, city) DO UPDATE
SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  campus_radius = EXCLUDED.campus_radius;
