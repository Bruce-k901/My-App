-- Check what pest control templates exist
SELECT 
  id,
  name,
  slug,
  company_id,
  evidence_types,
  repeatable_field_name,
  is_active,
  is_template_library,
  created_at
FROM public.task_templates
WHERE (
  slug LIKE '%pest%' OR slug LIKE '%weekly%pest%'
  OR name ILIKE '%pest%control%'
)
ORDER BY created_at DESC;

-- Check template fields for these templates
SELECT 
  tf.template_id,
  tt.name as template_name,
  tt.slug,
  COUNT(tf.id) as field_count
FROM public.template_fields tf
JOIN public.task_templates tt ON tf.template_id = tt.id
WHERE (
  tt.slug LIKE '%pest%' OR tt.slug LIKE '%weekly%pest%'
  OR tt.name ILIKE '%pest%control%'
)
GROUP BY tf.template_id, tt.name, tt.slug
ORDER BY field_count DESC;

