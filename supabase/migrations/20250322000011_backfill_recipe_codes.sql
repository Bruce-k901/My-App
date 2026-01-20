-- ============================================================================
-- Migration: 20250322000011_backfill_recipe_codes.sql
-- Description: Backfills recipe codes with correct prefixes based on recipe names
-- Step 1: Clear all existing codes
-- Step 2: Regenerate codes with correct prefixes
-- ============================================================================

DO $$
DECLARE
  v_recipe_id UUID;
  v_recipe_name TEXT;
  v_company_id UUID;
  v_prefix TEXT;
  v_next_number INTEGER;
  v_recipe_code TEXT;
  v_has_code_column BOOLEAN;
  v_cleared_count INTEGER := 0;
  v_updated_count INTEGER := 0;
BEGIN
  -- Check if code column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipes' 
    AND column_name = 'code'
  ) INTO v_has_code_column;

  IF NOT v_has_code_column THEN
    RAISE NOTICE 'Code column does not exist in stockly.recipes, adding it...';
    ALTER TABLE stockly.recipes ADD COLUMN code TEXT;
  END IF;

  -- STEP 1: Clear all existing codes first
  RAISE NOTICE 'Step 1: Clearing all existing recipe codes...';
  UPDATE stockly.recipes
  SET code = NULL
  WHERE code IS NOT NULL;
  
  GET DIAGNOSTICS v_cleared_count = ROW_COUNT;
  RAISE NOTICE 'Cleared % recipe code(s)', v_cleared_count;

  -- STEP 2: Generate new codes with correct prefixes
  RAISE NOTICE 'Step 2: Generating new recipe codes with correct prefixes...';
  
  FOR v_recipe_id, v_recipe_name, v_company_id IN
    SELECT id, name, company_id
    FROM stockly.recipes
    ORDER BY company_id, name
  LOOP
    -- Extract prefix: uppercase, remove non-letters, take first 3, pad with X
    v_prefix := UPPER(REGEXP_REPLACE(v_recipe_name, '[^A-Z]', '', 'g'));
    v_prefix := SUBSTRING(v_prefix FROM 1 FOR 3);
    
    -- Pad if less than 3 characters
    IF LENGTH(v_prefix) < 3 THEN
      v_prefix := RPAD(v_prefix, 3, 'X');
    END IF;

    -- Find highest number for this prefix in the same company (excluding the current recipe)
    SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'REC-' || v_prefix || '-(\d+)') AS INTEGER)), 0)
    INTO v_next_number
    FROM stockly.recipes
    WHERE company_id = v_company_id
      AND id != v_recipe_id  -- Exclude current recipe to avoid conflicts
      AND code IS NOT NULL
      AND code LIKE 'REC-' || v_prefix || '-%'
      AND code ~ ('^REC-' || v_prefix || '-\d{3}$');

    v_next_number := v_next_number + 1;
    v_recipe_code := 'REC-' || v_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');

    -- Update the recipe with the new code
    UPDATE stockly.recipes
    SET code = v_recipe_code
    WHERE id = v_recipe_id;

    v_updated_count := v_updated_count + 1;
    RAISE NOTICE 'Generated code % for recipe "%" (ID: %)', v_recipe_code, v_recipe_name, v_recipe_id;
  END LOOP;

  RAISE NOTICE 'Recipe code backfill completed: % codes generated', v_updated_count;
END $$;

