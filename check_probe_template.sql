-- Check if probe calibration template exists
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
WHERE slug = 'temperature_probe_calibration_audit'
ORDER BY created_at DESC;

-- Check template fields
SELECT 
  tf.template_id,
  tt.name as template_name,
  tt.slug,
  COUNT(tf.id) as field_count
FROM public.template_fields tf
JOIN public.task_templates tt ON tf.template_id = tt.id
WHERE tt.slug = 'temperature_probe_calibration_audit'
GROUP BY tf.template_id, tt.name, tt.slug;

