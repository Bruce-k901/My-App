-- Add contact_name and ensure category column exists in contractors table
-- Run this to fix missing columns

-- Add contact_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors' 
    AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.contractors ADD COLUMN contact_name text;
    RAISE NOTICE '✅ Added contact_name column to contractors table';
  ELSE
    RAISE NOTICE 'ℹ️ contact_name column already exists';
  END IF;
END $$;

-- Ensure category column exists and is properly configured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.contractors ADD COLUMN category text NOT NULL DEFAULT '';
    RAISE NOTICE '✅ Added category column to contractors table';
  ELSE
    -- If category exists but is nullable, update existing NULLs and make it NOT NULL
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'category'
      AND is_nullable = 'YES'
    ) THEN
      UPDATE public.contractors SET category = '' WHERE category IS NULL;
      ALTER TABLE public.contractors ALTER COLUMN category SET NOT NULL;
      ALTER TABLE public.contractors ALTER COLUMN category SET DEFAULT '';
      RAISE NOTICE '✅ Made category column NOT NULL';
    ELSE
      RAISE NOTICE 'ℹ️ category column already exists and is NOT NULL';
    END IF;
  END IF;
END $$;

-- Verify the columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contractors'
  AND column_name IN ('contact_name', 'category')
ORDER BY column_name;

