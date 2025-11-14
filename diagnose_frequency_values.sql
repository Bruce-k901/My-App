-- Diagnostic query to see what frequency values actually exist in the database
-- Run this in Supabase SQL Editor to see what we're dealing with

-- Check all frequency values and their counts
SELECT 
  frequency,
  COUNT(*) as count,
  array_agg(DISTINCT LOWER(TRIM(frequency))) as normalized_values
FROM task_templates
WHERE is_active = true
GROUP BY frequency
ORDER BY count DESC;

-- Check daily tasks specifically
SELECT 
  id,
  name,
  frequency,
  LOWER(TRIM(frequency)) as normalized_frequency,
  is_active,
  dayparts,
  company_id,
  site_id
FROM task_templates
WHERE is_active = true
ORDER BY frequency, name;

-- Test the query that should find daily tasks
SELECT 
  id,
  name,
  frequency,
  LOWER(TRIM(frequency)) as normalized
FROM task_templates
WHERE LOWER(TRIM(frequency)) = 'daily'
  AND is_active = true;

