-- ============================================================================
-- DIAGNOSTIC: Why are no tasks being created for today?
-- ============================================================================

-- Check 1: Do ANY tasks exist in the table?
SELECT 
  'Check 1: Total Tasks' as check_name,
  COUNT(*) as total_tasks,
  MIN(due_date) as earliest_date,
  MAX(due_date) as latest_date,
  COUNT(DISTINCT due_date) as unique_dates
FROM checklist_tasks;

-- Check 2: What dates DO have tasks?
SELECT 
  'Check 2: Tasks by Date' as check_name,
  due_date,
  COUNT(*) as task_count,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  MIN(generated_at) as first_generated,
  MAX(generated_at) as last_generated
FROM checklist_tasks
GROUP BY due_date
ORDER BY due_date DESC
LIMIT 10;

-- Check 3: Check today's date vs task dates
SELECT 
  'Check 3: Date Comparison' as check_name,
  CURRENT_DATE as today,
  CURRENT_TIMESTAMP as now,
  COUNT(*) FILTER (WHERE due_date = CURRENT_DATE) as tasks_today,
  COUNT(*) FILTER (WHERE due_date > CURRENT_DATE) as tasks_future,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as tasks_past
FROM checklist_tasks;

-- Check 4: Are there active templates?
SELECT 
  'Check 4: Active Templates' as check_name,
  frequency,
  COUNT(*) as template_count,
  COUNT(DISTINCT company_id) as unique_companies
FROM task_templates
WHERE is_active = true
GROUP BY frequency;

-- Check 5: Are there active sites?
SELECT 
  'Check 5: Active Sites' as check_name,
  COUNT(*) as total_sites,
  COUNT(*) FILTER (WHERE status IS NULL OR status != 'inactive') as active_sites,
  COUNT(DISTINCT company_id) as unique_companies
FROM sites;

-- Check 6: Recent task generation attempts
SELECT 
  'Check 6: Recent Tasks' as check_name,
  due_date,
  generated_at,
  template_id,
  site_id,
  status
FROM checklist_tasks
ORDER BY generated_at DESC
LIMIT 20;

-- Check 7: Check if Edge Function has been called (check function logs)
-- This requires checking Supabase Dashboard → Edge Functions → Logs
-- But we can check if tasks were generated recently
SELECT 
  'Check 7: Generation Timeline' as check_name,
  DATE(generated_at) as generation_date,
  COUNT(*) as tasks_generated,
  COUNT(DISTINCT template_id) as templates_used
FROM checklist_tasks
WHERE generated_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(generated_at)
ORDER BY generation_date DESC;

-- Check 8: Verify template/site relationships
SELECT 
  'Check 8: Template-Site Relationships' as check_name,
  t.id as template_id,
  t.name as template_name,
  t.frequency,
  t.company_id as template_company_id,
  t.site_id as template_site_id,
  s.id as site_id,
  s.company_id as site_company_id,
  s.status as site_status
FROM task_templates t
CROSS JOIN sites s
WHERE t.is_active = true
  AND (s.status IS NULL OR s.status != 'inactive')
  AND (t.company_id IS NULL OR t.company_id = s.company_id)
  AND (t.site_id IS NULL OR t.site_id = s.id)
LIMIT 10;

