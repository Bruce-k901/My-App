-- ============================================
-- CHECK: Why aren't temperature tasks being created?
-- ============================================

-- 1. Check if temperature tasks already exist for today (preventing duplicates)
SELECT 
  ct.id,
  ct.template_id,
  t.name as template_name,
  ct.site_id,
  s.name as site_name,
  ct.due_date,
  ct.daypart,
  ct.due_time,
  ct.status,
  ct.task_data->>'source' as source,
  ct.created_at
FROM checklist_tasks ct
JOIN task_templates t ON ct.template_id = t.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
  AND (t.slug LIKE '%fridge%' OR t.slug LIKE '%freezer%' OR t.slug LIKE '%hot%holding%' 
       OR t.name ILIKE '%fridge%' OR t.name ILIKE '%freezer%' OR t.name ILIKE '%hot%holding%')
ORDER BY ct.created_at DESC;

-- 2. Check what tasks WERE created today (all of them)
SELECT 
  ct.id,
  ct.template_id,
  t.name as template_name,
  ct.site_id,
  s.name as site_name,
  ct.due_date,
  ct.daypart,
  ct.due_time,
  ct.status,
  ct.task_data->>'source' as source,
  ct.created_at
FROM checklist_tasks ct
LEFT JOIN task_templates t ON ct.template_id = t.id
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.generated_at >= CURRENT_DATE
  AND ct.generated_at < CURRENT_DATE + INTERVAL '1 day'
ORDER BY ct.created_at DESC;

-- 3. Check if temperature templates have the right structure for cron
SELECT 
  t.id,
  t.name,
  t.slug,
  t.frequency,
  t.is_active,
  t.company_id,
  t.dayparts,
  t.time_of_day,
  t.recurrence_pattern,
  t.site_id,
  -- Check if this template would be processed
  CASE 
    WHEN t.frequency = 'daily' AND t.is_active = true THEN '✅ Should be processed'
    ELSE '❌ Will be skipped'
  END as cron_status
FROM task_templates t
WHERE (t.slug LIKE '%fridge%' OR t.slug LIKE '%freezer%' OR t.slug LIKE '%hot%holding%' 
       OR t.name ILIKE '%fridge%' OR t.name ILIKE '%freezer%' OR t.name ILIKE '%hot%holding%')
ORDER BY t.name;

-- 4. Simulate what the cron would create for temperature templates
-- This shows what SHOULD be created
SELECT 
  t.id as template_id,
  t.name as template_name,
  t.dayparts,
  s.id as site_id,
  s.name as site_name,
  dp.daypart,
  CASE 
    WHEN t.recurrence_pattern ? 'daypart_times' AND t.recurrence_pattern->'daypart_times' ? dp.daypart THEN
      t.recurrence_pattern->'daypart_times'->dp.daypart
    WHEN t.time_of_day IS NOT NULL THEN t.time_of_day
    ELSE '09:00'
  END as expected_time
FROM task_templates t
CROSS JOIN sites s
CROSS JOIN LATERAL unnest(COALESCE(t.dayparts, ARRAY['anytime'])) as dp(daypart)
WHERE t.frequency = 'daily'
  AND t.is_active = true
  AND (t.slug LIKE '%fridge%' OR t.slug LIKE '%freezer%' OR t.slug LIKE '%hot%holding%' 
       OR t.name ILIKE '%fridge%' OR t.name ILIKE '%freezer%' OR t.name ILIKE '%hot%holding%')
  AND (s.status IS NULL OR s.status != 'inactive')
  AND (t.company_id IS NULL OR s.company_id = t.company_id)
  AND (t.site_id IS NULL OR s.site_id = t.site_id)
  -- Check if this combination already exists
  AND NOT EXISTS (
    SELECT 1 FROM checklist_tasks ct
    WHERE ct.template_id = t.id
      AND ct.site_id = s.id
      AND ct.due_date = CURRENT_DATE
      AND ct.daypart = dp.daypart
  )
ORDER BY t.name, s.name, dp.daypart;

-- 5. Count expected vs actual tasks
SELECT 
  'Expected' as type,
  COUNT(*) as task_count
FROM task_templates t
CROSS JOIN sites s
CROSS JOIN LATERAL unnest(COALESCE(t.dayparts, ARRAY['anytime'])) as dp(daypart)
WHERE t.frequency = 'daily'
  AND t.is_active = true
  AND (t.slug LIKE '%fridge%' OR t.slug LIKE '%freezer%' OR t.slug LIKE '%hot%holding%' 
       OR t.name ILIKE '%fridge%' OR t.name ILIKE '%freezer%' OR t.name ILIKE '%hot%holding%')
  AND (s.status IS NULL OR s.status != 'inactive')
  AND (t.company_id IS NULL OR s.company_id = t.company_id)
  AND (t.site_id IS NULL OR s.site_id = t.site_id)
UNION ALL
SELECT 
  'Actual (created today)' as type,
  COUNT(*) as task_count
FROM checklist_tasks ct
JOIN task_templates t ON ct.template_id = t.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.task_data->>'source' = 'cron'
  AND (t.slug LIKE '%fridge%' OR t.slug LIKE '%freezer%' OR t.slug LIKE '%hot%holding%' 
       OR t.name ILIKE '%fridge%' OR t.name ILIKE '%freezer%' OR t.name ILIKE '%hot%holding%');

-- 6. Check the cron function return value
SELECT * FROM generate_daily_tasks_direct();



