-- ============================================================================
-- FIND ALL SEEDED/IMPORTED TEMPLATES
-- These are templates that were created by migrations, not by the user
-- ============================================================================

-- Check all templates marked as template_library (seeded templates)
SELECT 
  'Seeded Templates' as check_type,
  id,
  name,
  slug,
  company_id,
  frequency,
  is_active,
  is_template_library,
  dayparts,
  time_of_day,
  created_at
FROM task_templates
WHERE is_template_library = true
ORDER BY created_at DESC;

-- Count active seeded templates
SELECT 
  'Active Seeded Templates Count' as check_type,
  COUNT(*) as count,
  COUNT(CASE WHEN frequency = 'daily' THEN 1 END) as daily_count,
  COUNT(CASE WHEN frequency = 'weekly' THEN 1 END) as weekly_count,
  COUNT(CASE WHEN frequency = 'monthly' THEN 1 END) as monthly_count
FROM task_templates
WHERE is_template_library = true
  AND is_active = true;

-- Check which seeded templates are generating tasks
SELECT 
  'Seeded Templates Generating Tasks' as check_type,
  tt.id,
  tt.name,
  tt.frequency,
  COUNT(ct.id) as tasks_created,
  COUNT(CASE WHEN ct.due_date = CURRENT_DATE THEN 1 END) as today_tasks
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_template_library = true
  AND tt.is_active = true
  AND ct.due_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tt.id, tt.name, tt.frequency
ORDER BY tasks_created DESC;

