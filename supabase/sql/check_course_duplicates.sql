-- Check for courses with duplicate names but different IDs
SELECT 
  course_id,
  course_name,
  course_code,
  COUNT(DISTINCT profile_id) as employee_count,
  COUNT(*) as total_rows
FROM compliance_matrix_view
GROUP BY course_id, course_name, course_code
ORDER BY course_name, course_id
LIMIT 50;

-- Check if there are multiple course_ids with the same name
SELECT 
  course_name,
  COUNT(DISTINCT course_id) as unique_ids,
  COUNT(DISTINCT course_code) as unique_codes,
  STRING_AGG(DISTINCT course_id::TEXT, ', ') as all_course_ids
FROM compliance_matrix_view
GROUP BY course_name
HAVING COUNT(DISTINCT course_id) > 1
ORDER BY course_name;

