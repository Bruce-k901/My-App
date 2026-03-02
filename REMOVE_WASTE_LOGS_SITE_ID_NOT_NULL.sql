-- ============================================================================
-- Make site_id nullable in waste_logs table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Check current state
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'waste_logs' 
  AND column_name = 'site_id';

-- Drop NOT NULL constraint from site_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'waste_logs' 
    AND column_name = 'site_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.waste_logs
    ALTER COLUMN site_id DROP NOT NULL;
    
    RAISE NOTICE 'Removed NOT NULL constraint from public.waste_logs.site_id';
  ELSE
    RAISE NOTICE 'site_id column does not exist or is already nullable in public.waste_logs';
  END IF;
END $$;

-- Also check stockly schema if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'waste_logs' 
    AND column_name = 'site_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE stockly.waste_logs
    ALTER COLUMN site_id DROP NOT NULL;
    
    RAISE NOTICE 'Removed NOT NULL constraint from stockly.waste_logs.site_id';
  ELSE
    RAISE NOTICE 'site_id column does not exist or is already nullable in stockly.waste_logs';
  END IF;
END $$;
