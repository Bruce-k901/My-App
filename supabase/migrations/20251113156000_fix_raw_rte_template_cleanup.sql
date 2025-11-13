-- ============================================================================
-- Migration: Fix Raw vs RTE Separation Template - Remove Relics
-- Description: Comprehensive cleanup to remove all relic/legacy templates and ensure correct one exists
-- ============================================================================

begin;

-- Step 1: Remove ALL old/relic templates with similar names or slugs
-- This includes templates from old EHO imports, legacy systems, or duplicates

DO $$
DECLARE
  removed_count INTEGER := 0;
  template_ids UUID[];
BEGIN
  -- Find all templates that match relic patterns
  SELECT ARRAY_AGG(id) INTO template_ids
  FROM public.task_templates
  WHERE (
    -- Old EHO import slug
    slug = 'separate-raw-and-ready-to-eat-foods-7'
    -- Or any slug with similar patterns
    OR slug LIKE '%separate%raw%ready%'
    OR slug LIKE '%raw%rte%'
    OR slug LIKE '%raw%ready%to%eat%'
    -- Or similar names (but NOT our correct template)
    OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
    OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
    OR (name ILIKE '%separate%raw%' AND slug != 'raw_rte_separation_audit')
    -- Or templates with very basic descriptions (relic characteristic)
    OR (description ILIKE '%store raw meats below%' AND slug != 'raw_rte_separation_audit')
  );
  
  -- Remove template fields
  IF template_ids IS NOT NULL AND array_length(template_ids, 1) > 0 THEN
    DELETE FROM public.template_fields
    WHERE template_id = ANY(template_ids);
    
    DELETE FROM public.template_repeatable_labels
    WHERE template_id = ANY(template_ids);
    
    -- Remove the templates
    DELETE FROM public.task_templates
    WHERE id = ANY(template_ids);
    
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE 'Removed % relic/legacy raw RTE separation template(s)', removed_count;
  ELSE
    RAISE NOTICE 'No relic templates found to remove';
  END IF;
END $$;

-- Step 2: Verify the correct template exists and has proper structure
DO $$
DECLARE
  correct_template_id UUID;
  field_count INTEGER;
  template_record RECORD;
BEGIN
  -- Find the correct template
  SELECT id INTO correct_template_id
  FROM public.task_templates
  WHERE company_id IS NULL
    AND slug = 'raw_rte_separation_audit';
  
  IF correct_template_id IS NOT NULL THEN
    -- Get template details
    SELECT * INTO template_record
    FROM public.task_templates
    WHERE id = correct_template_id;
    
    -- Verify it has the correct structure
    SELECT COUNT(*) INTO field_count
    FROM public.template_fields
    WHERE template_id = correct_template_id;
    
    -- Check if template has correct properties
    IF template_record.is_active = false THEN
      RAISE NOTICE 'Warning: Template is marked as inactive. Updating to active.';
      UPDATE public.task_templates
      SET is_active = true
      WHERE id = correct_template_id;
    END IF;
    
    IF template_record.is_template_library = false THEN
      RAISE NOTICE 'Warning: Template is not marked as library template. Updating.';
      UPDATE public.task_templates
      SET is_template_library = true
      WHERE id = correct_template_id;
    END IF;
    
    IF field_count < 15 THEN
      RAISE NOTICE 'Warning: Template has only % fields (expected at least 15). Template may be incomplete.', field_count;
    ELSE
      RAISE NOTICE 'Template verified: % fields, active: %, library: %', 
        field_count, 
        template_record.is_active, 
        template_record.is_template_library;
    END IF;
  ELSE
    RAISE NOTICE 'Template raw_rte_separation_audit not found. Will be created by seed migration 20251113154000.';
  END IF;
END $$;

commit;

