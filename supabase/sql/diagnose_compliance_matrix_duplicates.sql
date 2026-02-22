-- Diagnose why compliance_matrix_view has duplicates

-- 1. Check if the view exists and count rows
SELECT 
  'View exists' as check_type,
  COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'compliance_matrix_view';

-- 2. Sample data from the view to see duplicates
SELECT 
  profile_id,
  full_name,
  course_id,
  course_name,
  COUNT(*) as duplicate_count
FROM compliance_matrix_view
GROUP BY profile_id, full_name, course_id, course_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, full_name, course_name
LIMIT 20;

-- 3. Check for duplicate courses in training_courses
SELECT 
  name,
  code,
  COUNT(*) as duplicate_count
FROM training_courses
WHERE is_active = true
GROUP BY name, code
HAVING COUNT(*) > 1;

-- 4. Check distinct training_types that match a course name exactly
SELECT DISTINCT
  tr.training_type,
  tc.name as course_name,
  tc.code as course_code,
  COUNT(DISTINCT tr.user_id) as employee_count
FROM training_records tr
CROSS JOIN training_courses tc
WHERE tc.is_active = true
  AND (
    LOWER(tr.training_type::TEXT) = LOWER(tc.name)
    OR LOWER(tr.training_type::TEXT) = LOWER(tc.code)
  )
GROUP BY tr.training_type, tc.name, tc.code
ORDER BY tr.training_type;

