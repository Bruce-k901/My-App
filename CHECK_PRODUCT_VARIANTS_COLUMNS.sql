-- ============================================================================
-- Check actual columns in stockly.product_variants
-- ============================================================================

-- 1. Check columns in stockly.product_variants table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'stockly' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;

-- 2. Check columns in public.product_variants view
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;

-- 3. Sample data to see what's actually there
SELECT * 
FROM stockly.product_variants 
LIMIT 1;
