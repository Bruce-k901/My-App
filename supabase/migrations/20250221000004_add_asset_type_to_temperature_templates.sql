-- ============================================================================
-- Add asset_type to Fridge/Freezer and Hot Holding templates
-- ============================================================================
-- This enables the AssetSelectionFeature in TaskFromTemplateModal
-- Asset selection requires BOTH repeatable_field_name AND asset_type to be set
-- ============================================================================
-- Note: This migration will be skipped if task_templates table doesn't exist yet

DO $$
DECLARE
  fridge_asset_type TEXT;
  hot_holding_asset_type TEXT;
BEGIN
  -- Only proceed if task_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    -- Update Fridge/Freezer Temperature Check template
    -- asset_type is used to enable AssetSelectionFeature (any non-null value works)
    -- Using 'fridge' as the value (matches schema examples: 'fridge', 'freezer', 'fire_alarm', 'fryer')
    UPDATE public.task_templates
    SET asset_type = 'fridge'
    WHERE slug = 'fridge-freezer-temperature-check'
      AND company_id IS NULL
      AND asset_type IS NULL;

    -- Update Hot Holding Temperature Verification template
    -- Using 'hot_holding' as the value
    UPDATE public.task_templates
    SET asset_type = 'hot_holding'
    WHERE slug = 'hot_holding_temperature_verification'
      AND company_id IS NULL
      AND asset_type IS NULL;

    -- Verify the updates
    -- Check Fridge template
    SELECT asset_type INTO fridge_asset_type
    FROM public.task_templates
    WHERE slug = 'fridge-freezer-temperature-check'
      AND company_id IS NULL;
    
    IF fridge_asset_type IS NOT NULL THEN
      RAISE NOTICE '✅ Fridge/Freezer template: asset_type = %', fridge_asset_type;
    ELSE
      RAISE NOTICE '⚠️  Fridge/Freezer template: asset_type is still NULL';
    END IF;
    
    -- Check Hot Holding template
    SELECT asset_type INTO hot_holding_asset_type
    FROM public.task_templates
    WHERE slug = 'hot_holding_temperature_verification'
      AND company_id IS NULL;
    
    IF hot_holding_asset_type IS NOT NULL THEN
      RAISE NOTICE '✅ Hot Holding template: asset_type = %', hot_holding_asset_type;
    ELSE
      RAISE NOTICE '⚠️  Hot Holding template: asset_type is still NULL';
    END IF;

  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping asset_type updates';
  END IF;
END $$;

