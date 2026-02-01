-- Backfill probation_end_date for employees (3 months from start_date)
-- This script will set the probation_end_date on profiles based on their start_date
-- Standard probation period is 3 months from start date

UPDATE profiles p
SET probation_end_date = (
  -- Add 3 months to start_date
  SELECT (start_date + INTERVAL '3 months')::DATE
  FROM profiles p2
  WHERE p2.id = p.id
    AND p2.start_date IS NOT NULL
)
WHERE p.start_date IS NOT NULL
  AND p.probation_end_date IS NULL
  AND p.company_id IS NOT NULL;

-- Verify the backfill worked
SELECT 
  COUNT(*) as total_profiles_with_start_date,
  COUNT(probation_end_date) as profiles_with_probation_end_date,
  COUNT(*) - COUNT(probation_end_date) as profiles_without_probation_end_date
FROM profiles
WHERE start_date IS NOT NULL
  AND company_id IS NOT NULL;

-- Show sample of updated profiles
SELECT 
  id,
  full_name,
  email,
  start_date,
  probation_end_date,
  (probation_end_date - start_date) as probation_days
FROM profiles
WHERE start_date IS NOT NULL
  AND probation_end_date IS NOT NULL
ORDER BY start_date DESC
LIMIT 20;


