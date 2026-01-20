-- ============================================================================
-- Diagnostic: Check stock_items table structure
-- Run this to see what columns actually exist
-- ============================================================================

-- Check if stockly.stock_items exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'stock_items')
    THEN '✓ stockly.stock_items EXISTS'
    ELSE '✗ stockly.stock_items DOES NOT EXIST'
  END AS table_check;

-- Check if public.stock_items exists (as table or view)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items' AND table_type = 'BASE TABLE')
    THEN '⚠️ public.stock_items EXISTS AS TABLE (should be view)'
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_items')
    THEN '✓ public.stock_items EXISTS AS VIEW'
    ELSE '✗ public.stock_items DOES NOT EXIST'
  END AS public_check;

-- List all columns in stockly.stock_items
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'stockly'
  AND table_name = 'stock_items'
ORDER BY ordinal_position;

-- Check if base_unit_id exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_items' 
      AND column_name = 'base_unit_id'
    )
    THEN '✓ base_unit_id EXISTS'
    ELSE '✗ base_unit_id DOES NOT EXIST'
  END AS base_unit_id_check;

-- If base_unit_id doesn't exist, show what unit-related columns exist
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'stockly'
  AND table_name = 'stock_items'
  AND (column_name ILIKE '%unit%' OR column_name ILIKE '%uom%');
