-- ============================================================================
-- Diagnose Probation Review Scheduling Issues
-- This will help identify why employees aren't being scheduled
-- ============================================================================

-- 1. Check employees with start_date
SELECT 
  p.id,
  p.full_name,
  p.start_date,
  p.company_id,
  p.reports_to,
  p.app_role,
  p.start_date + INTERVAL '90 days' as probation_date,
  CASE 
    WHEN p.start_date IS NULL THEN '❌ No start_date'
    WHEN p.company_id IS NULL THEN '❌ No company_id'
    WHEN p.reports_to IS NULL THEN '⚠️ No direct manager'
    ELSE '✅ Has manager'
  END as status
FROM profiles p
WHERE p.start_date IS NOT NULL
ORDER BY p.start_date DESC;

-- 2. Check if probation review template exists
SELECT 
  id,
  name,
  template_type,
  is_system_template,
  company_id,
  is_active
FROM review_templates
WHERE template_type = 'probation_review'
  AND is_active = true
ORDER BY is_system_template DESC, created_at DESC;

-- 3. Check existing probation review schedules
SELECT 
  ers.id,
  ers.employee_id,
  p.full_name as employee_name,
  ers.scheduled_date,
  ers.status,
  rt.name as template_name
FROM employee_review_schedules ers
JOIN profiles p ON ers.employee_id = p.id
JOIN review_templates rt ON ers.template_id = rt.id
WHERE rt.template_type = 'probation_review'
ORDER BY ers.scheduled_date DESC;

-- 4. Check for employees who should have probation reviews but don't
SELECT 
  p.id,
  p.full_name,
  p.start_date,
  p.start_date + INTERVAL '90 days' as probation_date,
  p.company_id,
  p.reports_to,
  CASE 
    WHEN p.reports_to IS NULL THEN 'No direct manager'
    ELSE (SELECT full_name FROM profiles WHERE id = p.reports_to)
  END as manager_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM review_templates 
      WHERE template_type = 'probation_review' 
        AND is_active = true
        AND (is_system_template = true OR company_id = p.company_id)
    ) THEN '❌ No template found'
    ELSE '✅ Template exists'
  END as template_status,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM employee_review_schedules ers
      JOIN review_templates rt ON ers.template_id = rt.id
      WHERE ers.employee_id = p.id
        AND rt.template_type = 'probation_review'
        AND ers.status IN ('scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee')
    ) THEN '✅ Already scheduled'
    ELSE '❌ Not scheduled'
  END as schedule_status
FROM profiles p
WHERE p.start_date IS NOT NULL
  AND p.company_id IS NOT NULL
ORDER BY p.start_date DESC;

-- 5. Check for potential managers (if reports_to is NULL)
SELECT 
  p.id as employee_id,
  p.full_name as employee_name,
  p.company_id,
  p.reports_to,
  (
    SELECT COUNT(*)
    FROM profiles m
    WHERE m.company_id = p.company_id
      AND m.id != p.id
      AND LOWER(COALESCE(m.app_role::text, '')) IN ('manager', 'admin', 'owner', 'general manager', 'super admin')
  ) as available_managers_count,
  (
    SELECT m.full_name
    FROM profiles m
    WHERE m.company_id = p.company_id
      AND m.id != p.id
      AND LOWER(COALESCE(m.app_role::text, '')) IN ('manager', 'admin', 'owner', 'general manager', 'super admin')
    LIMIT 1
  ) as potential_manager
FROM profiles p
WHERE p.start_date IS NOT NULL
  AND p.company_id IS NOT NULL
  AND p.reports_to IS NULL
ORDER BY p.start_date DESC;

