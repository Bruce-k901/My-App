-- Check what raw/RTE separation templates exist
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
  slug LIKE '%raw%' OR slug LIKE '%rte%' OR slug LIKE '%separation%'
  OR name ILIKE '%raw%' OR name ILIKE '%rte%' OR name ILIKE '%separation%'
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
  tt.slug LIKE '%raw%' OR tt.slug LIKE '%rte%' OR tt.slug LIKE '%separation%'
  OR tt.name ILIKE '%raw%' OR tt.name ILIKE '%rte%' OR tt.name ILIKE '%separation%'
)
GROUP BY tf.template_id, tt.name, tt.slug
ORDER BY field_count DESC;

