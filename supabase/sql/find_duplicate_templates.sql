-- Find duplicate templates
-- A duplicate is defined as templates with the same name and company_id
-- or same slug and company_id

-- Check for duplicates by name
SELECT 
  company_id,
  name,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as template_ids,
  STRING_AGG(created_at::text, ', ') as created_dates
FROM public.task_templates
WHERE company_id IS NOT NULL
  AND category = 'compliance'
GROUP BY company_id, name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, name;

-- Check for duplicates by slug
SELECT 
  company_id,
  slug,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as template_ids,
  STRING_AGG(name, ' | ') as template_names
FROM public.task_templates
WHERE company_id IS NOT NULL
  AND category = 'compliance'
GROUP BY company_id, slug
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, slug;

