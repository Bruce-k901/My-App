-- Migration: Verify pest control template has checklist items
-- Run this to check if the template was created correctly

SELECT 
  id,
  name,
  slug,
  repeatable_field_name,
  evidence_types,
  recurrence_pattern,
  recurrence_pattern->'default_checklist_items' as checklist_items,
  jsonb_array_length(recurrence_pattern->'default_checklist_items') as checklist_count
FROM task_templates 
WHERE slug = 'weekly_pest_control_inspection';

-- If checklist_items is NULL or empty, the template needs to be updated
-- Run the 20250204000003 migration again to fix it


