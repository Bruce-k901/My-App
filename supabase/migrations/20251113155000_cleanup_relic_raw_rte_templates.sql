-- ============================================================================
-- Migration: Cleanup Relic/Legacy Raw vs RTE Separation Templates
-- Description: Removes old/relic templates and ensures only the correct one exists
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

-- Remove any old/relic templates with similar names or slugs
-- This includes templates from old EHO imports or legacy systems

-- List of relic slugs to remove (from old EHO imports or legacy systems)
DO $$
DECLARE
  relic_slugs TEXT[] := ARRAY[
    'separate-raw-and-ready-to-eat-foods-7',
    'separate_raw_ready_to_eat',
    'raw_rte_separation',
    'raw_vs_rte_separation',
    'food_separation_audit',
    'raw_ready_to_eat_separation'
  ];
  
  relic_template_ids UUID[];
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Find template IDs with relic slugs
    SELECT ARRAY_AGG(id) INTO relic_template_ids
    FROM public.task_templates
    WHERE company_id IS NULL
      AND (
        slug = ANY(relic_slugs)
        OR slug LIKE '%separate%raw%ready%'
        OR slug LIKE '%raw%rte%'
        OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
        OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
      );
    
    -- Remove template fields for relic templates
    IF relic_template_ids IS NOT NULL AND array_length(relic_template_ids, 1) > 0 THEN
      DELETE FROM public.template_fields
      WHERE template_id = ANY(relic_template_ids);
      
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
        DELETE FROM public.template_repeatable_labels
        WHERE template_id = ANY(relic_template_ids);
      END IF;
      
      -- Remove the relic templates
      DELETE FROM public.task_templates
      WHERE id = ANY(relic_template_ids);
      
      RAISE NOTICE 'Removed % relic raw/RTE separation template(s)', array_length(relic_template_ids, 1);
    ELSE
      RAISE NOTICE 'No relic templates found to remove';
    END IF;

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping relic template cleanup';
  END IF;
END $$;

-- Ensure the correct template exists and is properly configured
-- If it doesn't exist, this will be created by the seed migration
-- But let's verify it has the correct structure

DO $$
DECLARE
  correct_template_id UUID;
  field_count INTEGER;
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Find the correct template
    SELECT id INTO correct_template_id
    FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'raw_rte_separation_audit';
    
    IF correct_template_id IS NOT NULL THEN
      -- Verify it has the correct fields
      SELECT COUNT(*) INTO field_count
      FROM public.template_fields
      WHERE template_id = correct_template_id;
      
      -- If it has fewer than 15 fields, it might be incomplete
      IF field_count < 15 THEN
        RAISE NOTICE 'Warning: Template raw_rte_separation_audit has only % fields (expected at least 15). May need to re-run seed migration.', field_count;
      ELSE
        RAISE NOTICE 'Template raw_rte_separation_audit verified with % fields', field_count;
      END IF;
    ELSE
      RAISE NOTICE 'Template raw_rte_separation_audit not found. Run seed migration to create it.';
    END IF;

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping template verification';
  END IF;
END $$;

