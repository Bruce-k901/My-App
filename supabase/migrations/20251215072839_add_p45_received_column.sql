-- ============================================================================
-- Migration: 20251215072839_add_p45_received_column.sql
-- Description: Add p45_received column to profiles table
-- This column was missing from the initial migration
-- ============================================================================

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
