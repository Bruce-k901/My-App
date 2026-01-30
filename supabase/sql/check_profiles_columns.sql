-- Check which columns exist in the profiles table
-- Run this to verify columns exist before updating the function

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'probation_end_date',
    'hourly_rate',
    'right_to_work_document_number',
    'employee_number',
    'contracted_hours_per_week',
    'start_date'
  )
ORDER BY column_name;


