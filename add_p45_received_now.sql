-- Quick SQL to add p45_received column
-- Run this directly in Supabase SQL Editor if migration conflicts occur

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Add p45_received column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'p45_received'
    ) THEN
      ALTER TABLE public.profiles
      ADD COLUMN p45_received BOOLEAN DEFAULT false;
      
      RAISE NOTICE '✅ Added p45_received column to profiles table';
    ELSE
      RAISE NOTICE 'ℹ️  p45_received column already exists in profiles table';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  profiles table does not exist - skipping column addition';
  END IF;
END $$;
