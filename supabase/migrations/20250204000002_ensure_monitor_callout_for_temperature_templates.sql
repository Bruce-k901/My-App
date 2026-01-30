-- Migration: Ensure Monitor/Callout is enabled for templates with temperature recording
-- Description: Verifies that templates with temperature evidence types are properly configured
-- Note: Monitor/Callout is a UI feature that's automatically enabled when temperature is present
-- This migration ensures the hot holding template and any other temperature templates are correctly set up
-- Note: This migration will be skipped if task_templates table doesn't exist yet

-- Verify hot holding template has temperature in evidence_types
-- Only run if task_templates table exists
DO $$
DECLARE
  hot_holding_id UUID;
  hot_holding_evidence_types TEXT[];
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Get the hot holding template
    SELECT id, evidence_types INTO hot_holding_id, hot_holding_evidence_types
    FROM task_templates
    WHERE slug = 'hot_holding_temperature_verification';
    
    IF hot_holding_id IS NOT NULL THEN
      -- Verify temperature is in evidence_types
      IF NOT ('temperature' = ANY(hot_holding_evidence_types)) THEN
        -- Add temperature if missing
        UPDATE task_templates
        SET evidence_types = array_append(evidence_types, 'temperature')
        WHERE id = hot_holding_id;
        
        RAISE NOTICE '✅ Added temperature to hot holding template evidence_types';
      ELSE
        RAISE NOTICE '✅ Hot holding template already has temperature in evidence_types';
      END IF;
      
      RAISE NOTICE '✅ Hot Holding Temperature Verification template verified (ID: %)', hot_holding_id;
      RAISE NOTICE '   Evidence types: %', array_to_string(hot_holding_evidence_types, ', ');
    ELSE
      RAISE NOTICE '⚠️  Hot holding template not found - may need to run previous migration first';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  task_templates table does not exist yet - skipping verification';
  END IF;
END $$;

-- Verify all templates with temperature have it properly configured
-- Only run if task_templates table exists
DO $$
DECLARE
  template_record RECORD;
  temp_count INTEGER;
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    -- Count templates with temperature
    SELECT COUNT(*) INTO temp_count
    FROM task_templates
    WHERE 'temperature' = ANY(evidence_types)
      AND is_active = true;
    
    RAISE NOTICE '✅ Found % active template(s) with temperature recording', temp_count;
    RAISE NOTICE '   These templates will automatically have Monitor/Callout enabled in the UI';
  ELSE
    RAISE NOTICE '⚠️  task_templates table does not exist yet - skipping template count';
  END IF;
END $$;


