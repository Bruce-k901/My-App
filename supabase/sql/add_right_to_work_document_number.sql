-- Add right_to_work_document_number column to profiles table
-- This stores passport numbers, share codes, visa numbers, BRP numbers, etc.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS right_to_work_document_number TEXT;

    RAISE NOTICE '✅ Added right_to_work_document_number column to profiles table';
  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping column addition';
  END IF;
END $$;


