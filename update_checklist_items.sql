-- ============================================================================
-- Update Raw RTE Separation Template - Add Checklist Items
-- Description: Updates the recurrence_pattern to include the yes/no checklist items
-- ============================================================================

begin;

-- Update the template's recurrence_pattern to include the checklist items
UPDATE public.task_templates
SET recurrence_pattern = jsonb_build_object(
  'daypart_times', jsonb_build_object('before_open', '07:00'),
  'default_checklist_items', jsonb_build_array(
    'Raw meats stored BELOW cooked/ready-to-eat items',
    'Drip trays present under raw meat storage',
    'Color-coded containers used correctly',
    'Dedicated utensils for raw vs ready-to-eat',
    'Physical barriers between zones where needed'
  )
)
WHERE company_id IS NULL 
  AND slug = 'raw_rte_separation_audit';

-- Verify the update
DO $$
DECLARE
  template_record RECORD;
  checklist_items JSONB;
BEGIN
  SELECT recurrence_pattern INTO template_record
  FROM public.task_templates
  WHERE company_id IS NULL AND slug = 'raw_rte_separation_audit';
  
  IF template_record.recurrence_pattern IS NULL THEN
    RAISE EXCEPTION 'Template not found or recurrence_pattern is NULL';
  END IF;
  
  checklist_items := template_record.recurrence_pattern->'default_checklist_items';
  
  IF checklist_items IS NULL THEN
    RAISE EXCEPTION 'default_checklist_items not found in recurrence_pattern';
  END IF;
  
  RAISE NOTICE '✅ Checklist items updated successfully:';
  RAISE NOTICE '   Found % checklist items', jsonb_array_length(checklist_items);
  
  -- Show each item
  FOR i IN 0..jsonb_array_length(checklist_items) - 1 LOOP
    RAISE NOTICE '   %: %', i + 1, checklist_items->i;
  END LOOP;
END $$;

commit;

