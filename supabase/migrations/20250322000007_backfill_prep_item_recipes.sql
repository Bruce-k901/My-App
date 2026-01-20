-- ============================================================================
-- Migration: 20250322000007_backfill_prep_item_recipes.sql
-- Description: Backfills recipes for ingredients marked as prep items that don't have linked recipes
-- ============================================================================

DO $$
DECLARE
  v_ingredient RECORD;
  v_recipe_id UUID;
  v_recipe_code TEXT;
  v_item_prefix TEXT;
  v_next_number INTEGER;
  v_user_id UUID;
  v_created_count INTEGER := 0;
  v_unit_text TEXT;
  v_has_code BOOLEAN;
  v_has_status BOOLEAN;
  v_has_output_ingredient BOOLEAN;
  v_has_yield_qty BOOLEAN;
  v_has_yield_unit_id BOOLEAN;
  v_has_ingredient_cost BOOLEAN;
  v_has_version_number BOOLEAN;
BEGIN
  -- Ensure code column exists (add if it doesn't)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'code'
  ) THEN
    ALTER TABLE stockly.recipes ADD COLUMN code TEXT;
  END IF;
  
  -- Check which optional columns exist
  SELECT TRUE INTO v_has_code; -- Code column now guaranteed to exist
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'recipe_status'
  ) INTO v_has_status;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'output_ingredient_id'
  ) INTO v_has_output_ingredient;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'yield_qty'
  ) INTO v_has_yield_qty;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'yield_unit_id'
  ) INTO v_has_yield_unit_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'ingredient_cost'
  ) INTO v_has_ingredient_cost;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'stockly' AND table_name = 'recipes' AND column_name = 'version_number'
  ) INTO v_has_version_number;

  -- Get a default user ID (use first admin/manager if available, otherwise NULL)
  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  -- Loop through all ingredients marked as prep items without linked recipes
  FOR v_ingredient IN
    SELECT 
      il.id,
      il.ingredient_name,
      il.company_id,
      il.base_unit_id,
      il.unit,
      c.name as company_name
    FROM public.ingredients_library il
    JOIN public.companies c ON il.company_id = c.id
    WHERE il.is_prep_item = true
      AND (il.linked_recipe_id IS NULL OR il.linked_recipe_id NOT IN (
        SELECT id FROM stockly.recipes WHERE id = il.linked_recipe_id
      ))
    ORDER BY il.company_id, il.ingredient_name
  LOOP
    BEGIN
      -- Generate recipe code (REC-{PREFIX}-{NUMBER})
      -- Extract first 3 letters from ingredient name
      v_item_prefix := UPPER(REGEXP_REPLACE(LEFT(v_ingredient.ingredient_name, 3), '[^A-Z]', '', 'g'));
      IF LENGTH(v_item_prefix) < 3 THEN
        v_item_prefix := RPAD(v_item_prefix, 3, 'X');
      END IF;
      
      -- Find highest number for this prefix
      SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'REC-' || v_item_prefix || '-(\d+)') AS INTEGER)), 0)
      INTO v_next_number
      FROM stockly.recipes
      WHERE company_id = v_ingredient.company_id
        AND code IS NOT NULL
        AND code LIKE 'REC-' || v_item_prefix || '-%';
      
      v_next_number := v_next_number + 1;
      v_recipe_code := 'REC-' || v_item_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
      
      -- Get unit text for yield_unit (TEXT column)
      v_unit_text := COALESCE(v_ingredient.unit, 'portion');
      
      -- Create recipe placeholder using base columns that always exist
      INSERT INTO stockly.recipes (
        company_id,
        name,
        recipe_type,
        yield_quantity,
        yield_unit,
        is_active,
        is_ingredient,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        v_ingredient.company_id,
        v_ingredient.ingredient_name,
        'prep',
        1,
        v_unit_text,
        false,
        true,
        v_user_id,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_recipe_id;
      
      -- Update code (always set it)
      UPDATE stockly.recipes SET code = v_recipe_code WHERE id = v_recipe_id;
      
      IF v_has_status THEN
        EXECUTE format('UPDATE stockly.recipes SET recipe_status = %L WHERE id = %L', 'draft', v_recipe_id);
      END IF;
      
      IF v_has_output_ingredient THEN
        EXECUTE format('UPDATE stockly.recipes SET output_ingredient_id = %L WHERE id = %L', v_ingredient.id, v_recipe_id);
      END IF;
      
      IF v_has_yield_qty THEN
        EXECUTE format('UPDATE stockly.recipes SET yield_qty = 1 WHERE id = %L', v_recipe_id);
      END IF;
      
      IF v_has_yield_unit_id AND v_ingredient.base_unit_id IS NOT NULL THEN
        EXECUTE format('UPDATE stockly.recipes SET yield_unit_id = %L WHERE id = %L', v_ingredient.base_unit_id, v_recipe_id);
      END IF;
      
      IF v_has_ingredient_cost THEN
        EXECUTE format('UPDATE stockly.recipes SET ingredient_cost = 0 WHERE id = %L', v_recipe_id);
      END IF;
      
      IF v_has_version_number THEN
        EXECUTE format('UPDATE stockly.recipes SET version_number = 1.0 WHERE id = %L', v_recipe_id);
      END IF;
      
      -- Link recipe back to ingredient
      UPDATE public.ingredients_library
      SET linked_recipe_id = v_recipe_id
      WHERE id = v_ingredient.id;
      
      v_created_count := v_created_count + 1;
      
      RAISE NOTICE 'Created recipe % for ingredient % (company: %)', 
        COALESCE(v_recipe_code, 'NO-CODE'), v_ingredient.ingredient_name, v_ingredient.company_name;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with next ingredient
        RAISE WARNING 'Failed to create recipe for ingredient % (id: %): %', 
          v_ingredient.ingredient_name, v_ingredient.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Created % recipe(s) for prep items', v_created_count;
  
  -- Backfill codes for existing recipes that don't have codes
  RAISE NOTICE 'Backfilling codes for existing recipes without codes...';
  FOR v_ingredient IN
    SELECT 
      r.id as recipe_id,
      r.name as recipe_name,
      r.company_id
    FROM stockly.recipes r
    WHERE (r.code IS NULL OR r.code = '')
      AND r.company_id IS NOT NULL
    ORDER BY r.company_id, r.name
  LOOP
    BEGIN
      -- Generate recipe code
      v_item_prefix := UPPER(REGEXP_REPLACE(LEFT(v_ingredient.recipe_name, 3), '[^A-Z]', '', 'g'));
      IF LENGTH(v_item_prefix) < 3 THEN
        v_item_prefix := RPAD(v_item_prefix, 3, 'X');
      END IF;
      
      -- Find highest number for this prefix
      SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'REC-' || v_item_prefix || '-(\d+)') AS INTEGER)), 0)
      INTO v_next_number
      FROM stockly.recipes
      WHERE company_id = v_ingredient.company_id
        AND code IS NOT NULL
        AND code LIKE 'REC-' || v_item_prefix || '-%';
      
      v_next_number := v_next_number + 1;
      v_recipe_code := 'REC-' || v_item_prefix || '-' || LPAD(v_next_number::TEXT, 3, '0');
      
      -- Update recipe with code
      UPDATE stockly.recipes
      SET code = v_recipe_code
      WHERE id = v_ingredient.recipe_id;
      
      RAISE NOTICE 'Backfilled code % for recipe %', v_recipe_code, v_ingredient.recipe_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to backfill code for recipe % (id: %): %', 
          v_ingredient.recipe_name, v_ingredient.recipe_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Code backfill complete';
END $$;
