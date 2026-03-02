-- Verify and add missing columns to contractors table
-- This ensures contact_name and category are properly set up

-- Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contractors'
ORDER BY ordinal_position;

-- Add contact_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors' 
    AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE public.contractors ADD COLUMN contact_name text;
    RAISE NOTICE 'Added contact_name column';
  ELSE
    RAISE NOTICE 'contact_name column already exists';
  END IF;
END $$;

-- Verify category column exists and is NOT NULL (it should be required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contractors' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.contractors ADD COLUMN category text NOT NULL DEFAULT '';
    RAISE NOTICE 'Added category column';
  ELSE
    -- Check if it's nullable and make it NOT NULL if needed
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'category'
      AND is_nullable = 'YES'
    ) THEN
      -- First set any NULL values to empty string
      UPDATE public.contractors SET category = '' WHERE category IS NULL;
      -- Then make it NOT NULL
      ALTER TABLE public.contractors ALTER COLUMN category SET NOT NULL;
      ALTER TABLE public.contractors ALTER COLUMN category SET DEFAULT '';
      RAISE NOTICE 'Made category column NOT NULL';
    ELSE
      RAISE NOTICE 'category column already exists and is NOT NULL';
    END IF;
  END IF;
END $$;

-- Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contractors'
ORDER BY ordinal_position;

