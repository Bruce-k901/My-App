-- ============================================================================
-- Find PPM Tables in Database
-- ============================================================================
-- Run this first to see what PPM tables actually exist
-- ============================================================================

-- List all tables with 'ppm' in the name
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name LIKE '%ppm%'
  AND table_schema = 'public'
ORDER BY table_name;

-- Get columns for each PPM table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name LIKE '%ppm%'
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
