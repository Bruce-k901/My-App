-- Test script to debug daily task generation
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check what daily templates exist
SELECT 
  id,
  name,
  frequency,
  LOWER(TRIM(COALESCE(frequency, ''))) as normalized_frequency,
  is_active,
  company_id,
  site_id,
  dayparts,
  time_of_day
FROM task_templates
WHERE LOWER(TRIM(COALESCE(frequency, ''))) = 'daily'
  AND (is_active = true OR is_active IS NULL)
ORDER BY name;

-- 2. Count templates by frequency
SELECT 
  frequency,
  LOWER(TRIM(COALESCE(frequency, ''))) as normalized,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true OR is_active IS NULL) as active_count
FROM task_templates
GROUP BY frequency
ORDER BY count DESC;

-- 3. Check what sites exist
SELECT 
  id,
  name,
  company_id,
  status,
  is_active
FROM sites
WHERE (status IS NULL OR status != 'inactive')
ORDER BY name;

-- 4. Test the function manually and see results
SELECT * FROM generate_daily_tasks_direct();

-- 5. Check if any tasks were created today
SELECT 
  ct.id,
  ct.template_id,
  tt.name as template_name,
  ct.site_id,
  s.name as site_name,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.status,
  ct.created_at
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON ct.template_id = tt.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
ORDER BY ct.created_at DESC
LIMIT 50;

