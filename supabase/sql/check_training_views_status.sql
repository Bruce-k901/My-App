-- Check if views exist
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('compliance_matrix_view', 'training_records_view', 'training_stats_view', 'company_training_overview')
ORDER BY viewname;

-- Check what columns training_records actually has
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'training_records'
ORDER BY ordinal_position;

