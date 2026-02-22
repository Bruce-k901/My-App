-- ============================================================================
-- Backfill Probation Reviews for Existing Employees (Verbose Version)
-- Description: Manually schedule probation reviews with detailed diagnostics
-- ============================================================================

-- First, run diagnostics to see what we're working with
SELECT '=== DIAGNOSTICS ===' as section;

-- Check employees with start_date
SELECT 
  'Employees with start_date' as check_type,
  COUNT(*) as count
FROM profiles
WHERE start_date IS NOT NULL AND company_id IS NOT NULL;

-- Check if template exists
SELECT 
  'Probation templates available' as check_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as template_names
FROM review_templates
WHERE template_type = 'probation_review' AND is_active = true;

-- Check existing schedules
SELECT 
  'Existing probation schedules' as check_type,
  COUNT(*) as count
FROM employee_review_schedules ers
JOIN review_templates rt ON ers.template_id = rt.id
WHERE rt.template_type = 'probation_review';

-- Now run the backfill
SELECT '=== RUNNING BACKFILL ===' as section;

SELECT 
  employee_id,
  employee_name,
  start_date,
  probation_date,
  scheduled,
  CASE 
    WHEN scheduled THEN '✅ Scheduled successfully'
    ELSE '❌ Failed - check diagnostics below'
  END as status
FROM public.schedule_missing_probation_reviews()
ORDER BY start_date DESC;

-- Summary
SELECT '=== SUMMARY ===' as section;

SELECT 
  COUNT(*) FILTER (WHERE scheduled = true) as successfully_scheduled,
  COUNT(*) FILTER (WHERE scheduled = false) as failed,
  COUNT(*) as total_employees_processed
FROM public.schedule_missing_probation_reviews();

-- Detailed failure analysis
SELECT '=== FAILURE ANALYSIS ===' as section;

SELECT 
  p.id,
  p.full_name,
  p.start_date,
  p.company_id,
  p.reports_to,
  CASE 
    WHEN p.reports_to IS NULL THEN (
      SELECT COUNT(*)
      FROM profiles m
      WHERE m.company_id = p.company_id
        AND m.id != p.id
        AND LOWER(COALESCE(m.app_role::text, '')) IN ('manager', 'admin', 'owner', 'general manager', 'super admin')
    )
    ELSE 1
  END as manager_available,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM review_templates 
      WHERE template_type = 'probation_review' 
        AND is_active = true
        AND (is_system_template = true OR company_id = p.company_id)
    ) THEN 'Yes'
    ELSE 'No'
  END as template_available,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM employee_review_schedules ers
      JOIN review_templates rt ON ers.template_id = rt.id
      WHERE ers.employee_id = p.id
        AND rt.template_type = 'probation_review'
        AND ers.status IN ('scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee')
    ) THEN 'Yes'
    ELSE 'No'
  END as already_scheduled
FROM profiles p
WHERE p.start_date IS NOT NULL
  AND p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM employee_review_schedules ers
    JOIN review_templates rt ON ers.template_id = rt.id
    WHERE ers.employee_id = p.id
      AND rt.template_type = 'probation_review'
      AND ers.status IN ('scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee')
  )
ORDER BY p.start_date DESC;

