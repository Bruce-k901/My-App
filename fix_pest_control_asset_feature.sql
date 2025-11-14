-- ============================================================================
-- Fix Pest Control Template - Remove Asset Feature
-- Description: Ensures repeatable_field_name is NULL to disable asset selection
-- ============================================================================

begin;

-- Check current state
DO $$
DECLARE
  template_record RECORD;
BEGIN
  SELECT * INTO template_record
  FROM public.task_templates
  WHERE company_id IS NULL 
    AND slug = 'pest_control_device_inspection';
  
  IF template_record.id IS NULL THEN
    RAISE NOTICE 'Template not found. Run the seed migration first.';
  ELSE
    RAISE NOTICE 'Current template state:';
    RAISE NOTICE '  Name: %', template_record.name;
    RAISE NOTICE '  Slug: %', template_record.slug;
    RAISE NOTICE '  repeatable_field_name: %', template_record.repeatable_field_name;
    RAISE NOTICE '  asset_type: %', template_record.asset_type;
    RAISE NOTICE '  evidence_types: %', template_record.evidence_types;
    
    IF template_record.repeatable_field_name IS NOT NULL THEN
      RAISE NOTICE '  ⚠️  Asset feature is ENABLED (repeatable_field_name = %)', template_record.repeatable_field_name;
    ELSE
      RAISE NOTICE '  ✅ Asset feature is DISABLED (repeatable_field_name = NULL)';
    END IF;
  END IF;
END $$;

-- Fix the template: Set repeatable_field_name to NULL
UPDATE public.task_templates
SET 
  repeatable_field_name = NULL,
  asset_type = NULL
WHERE company_id IS NULL 
  AND slug = 'pest_control_device_inspection';

-- Verify the fix
DO $$
DECLARE
  updated_count INTEGER;
  template_record RECORD;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    SELECT * INTO template_record
    FROM public.task_templates
    WHERE company_id IS NULL 
      AND slug = 'pest_control_device_inspection';
    
    RAISE NOTICE '✅ Template updated successfully:';
    RAISE NOTICE '   repeatable_field_name: %', template_record.repeatable_field_name;
    RAISE NOTICE '   asset_type: %', template_record.asset_type;
    
    IF template_record.repeatable_field_name IS NULL THEN
      RAISE NOTICE '   ✅ Asset feature is now DISABLED';
    ELSE
      RAISE WARNING '   ⚠️  Asset feature is still ENABLED - check for errors';
    END IF;
  ELSE
    RAISE NOTICE 'No template found to update. Template may not exist yet.';
  END IF;
END $$;

commit;

