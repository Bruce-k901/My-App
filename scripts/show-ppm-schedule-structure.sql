-- ============================================================================
-- Show PPM Schedule Table Structure
-- ============================================================================

-- Show all columns in ppm_schedule table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ppm_schedule'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM ppm_schedule LIMIT 5;
