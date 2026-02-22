-- ============================================================================
-- Migration: 20250205000010_fix_workplace_template_features.sql
-- Description: Explicitly fix workplace inspection template to ensure correct features
-- This ensures requires_sop and requires_risk_assessment are FALSE
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- Explicitly set requires_sop and requires_risk_assessment to FALSE for workplace inspection
-- Only update if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    UPDATE task_templates
    SET 
      requires_sop = FALSE,
      requires_risk_assessment = FALSE,
      repeatable_field_name = NULL  -- Ensure no asset selection
    WHERE slug = 'workplace_inspection';
  END IF;
END $$;

-- Verification (only if table exists)
DO $$
DECLARE
  template_record RECORD;
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    SELECT * INTO template_record
    FROM task_templates 
    WHERE slug = 'workplace_inspection';
  
    IF template_record.id IS NOT NULL THEN
      RAISE NOTICE '✅ Workplace Inspection template features fixed:';
      RAISE NOTICE '   Template ID: %', template_record.id;
      RAISE NOTICE '   repeatable_field_name: % (should be NULL)', template_record.repeatable_field_name;
      RAISE NOTICE '   requires_sop: % (should be FALSE)', template_record.requires_sop;
      RAISE NOTICE '   requires_risk_assessment: % (should be FALSE)', template_record.requires_risk_assessment;
      RAISE NOTICE '   evidence_types: %', template_record.evidence_types;
      
      -- Verify feature configuration
      IF template_record.repeatable_field_name IS NULL THEN
        RAISE NOTICE '   ✓ Asset selection DISABLED (correct)';
      ELSE
        RAISE WARNING '   ⚠️ Asset selection ENABLED (should be NULL)';
      END IF;
      
      IF template_record.requires_sop = FALSE AND template_record.requires_risk_assessment = FALSE THEN
        RAISE NOTICE '   ✓ Document upload DISABLED (correct)';
      ELSE
        RAISE WARNING '   ⚠️ Document upload ENABLED (should be FALSE)';
      END IF;
      
      -- Library dropdown should always be false (hardcoded in feature detection)
      RAISE NOTICE '   ✓ Library dropdown DISABLED (hardcoded to false)';
      
    ELSE
      RAISE NOTICE '⚠️ Template not found (may not exist yet): workplace_inspection';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

