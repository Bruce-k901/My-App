-- Backfill working temperature ranges for existing assets based on category and name
-- This migration sets appropriate default temperature ranges for common asset types
-- Based on UK Food Safety standards and best practices

-- 1. Set ranges for freezers FIRST (more specific, before general refrigeration)
-- Default: -20 to -18°C (UK recommended range, legal is ≤-18°C)
-- Case-insensitive category matching to handle "Refrigeration", "refrigeration", etc.
UPDATE public.assets
SET 
  working_temp_min = -20,
  working_temp_max = -18
WHERE LOWER(TRIM(COALESCE(category, ''))) LIKE '%refrigerat%'
  AND (working_temp_min IS NULL AND working_temp_max IS NULL)
  AND (
    LOWER(COALESCE(name, '')) LIKE '%freezer%' OR
    LOWER(COALESCE(name, '')) LIKE '%blast%' OR
    LOWER(COALESCE(name, '')) LIKE '%frozen%'
  );

-- 2. Fallback: Set for ANY refrigeration category asset that still doesn't have ranges
-- This catches all refrigeration assets (fridges/chillers) that don't match freezer patterns
-- Default: 0-5°C (UK recommended range, legal max is 8°C)
UPDATE public.assets
SET 
  working_temp_min = 0,
  working_temp_max = 5
WHERE LOWER(TRIM(COALESCE(category, ''))) LIKE '%refrigerat%'
  AND (working_temp_min IS NULL AND working_temp_max IS NULL);

-- 3. Set ranges for hot-holding equipment (cooking category)
-- Case-insensitive to handle "Cooking & Prep", "cooking", etc.
-- Default: 63°C minimum (UK legal requirement)
UPDATE public.assets
SET 
  working_temp_min = 63,
  working_temp_max = NULL  -- No max for hot-holding
WHERE (LOWER(TRIM(COALESCE(category, ''))) LIKE '%cooking%' 
    OR LOWER(TRIM(COALESCE(category, ''))) LIKE '%prep%')
  AND (working_temp_min IS NULL AND working_temp_max IS NULL)
  AND (
    LOWER(COALESCE(name, '')) LIKE '%hot%' OR
    LOWER(COALESCE(name, '')) LIKE '%bain%' OR
    LOWER(COALESCE(name, '')) LIKE '%holding%' OR
    LOWER(COALESCE(name, '')) LIKE '%display%' OR
    LOWER(COALESCE(name, '')) LIKE '%warmer%'
  );

-- 4. Set ranges for ambient storage areas
-- Default: 10-20°C (advisory range)
UPDATE public.assets
SET 
  working_temp_min = 10,
  working_temp_max = 20
WHERE (LOWER(TRIM(COALESCE(category, ''))) = 'other' OR category IS NULL)
  AND (working_temp_min IS NULL AND working_temp_max IS NULL)
  AND (
    LOWER(COALESCE(name, '')) LIKE '%ambient%' OR
    LOWER(COALESCE(name, '')) LIKE '%dry%' OR
    LOWER(COALESCE(name, '')) LIKE '%store%' OR
    LOWER(COALESCE(name, '')) LIKE '%storage%'
  );

-- Note: Assets that don't match any of the above patterns will remain NULL
-- Users can manually set temperature ranges for these assets through the UI

-- Add a comment for documentation (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assets' 
    AND column_name = 'working_temp_min'
  ) THEN
    COMMENT ON COLUMN public.assets.working_temp_min IS 
    'Minimum working temperature in Celsius. Auto-populated for common asset types. Users can override via UI.';
    
    COMMENT ON COLUMN public.assets.working_temp_max IS 
    'Maximum working temperature in Celsius. Auto-populated for common asset types. Users can override via UI.';
  END IF;
END $$;
