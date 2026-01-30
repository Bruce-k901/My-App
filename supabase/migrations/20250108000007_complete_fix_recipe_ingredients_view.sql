-- Complete fix for recipe_ingredients view and all related functions
-- This ensures the view, triggers, and all functions use ingredient_id consistently
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping complete_fix_recipe_ingredients_view migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with complete_fix_recipe_ingredients_view migration';
END $$;

-- Only proceed if schema exists (checked above)
DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RETURN;
  END IF;

  -- 1. Drop and recreate the view triggers with correct column names
  -- These are the INSTEAD OF triggers that handle INSERT/UPDATE on the view
  -- Only drop triggers if the view exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients;
    DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients;
  END IF;

  -- Drop old functions that might have wrong column names
  DROP FUNCTION IF EXISTS public.insert_recipe_ingredients() CASCADE;
  DROP FUNCTION IF EXISTS public.update_recipe_ingredients() CASCADE;

  -- 2. Create new insert function with correct schema (ingredient_id, unit_id, sort_order)
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION public.insert_recipe_ingredients()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_id UUID;
    BEGIN
      INSERT INTO stockly.recipe_ingredients (
        id, recipe_id, ingredient_id, sub_recipe_id, quantity, unit_id,
        sort_order, line_cost, company_id, created_at, updated_at
      ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()),
        NEW.recipe_id,
        NEW.ingredient_id,
        NEW.sub_recipe_id,
        NEW.quantity,
        NEW.unit_id,
        COALESCE(NEW.sort_order, 0),
        NEW.line_cost,
        NEW.company_id,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW())
      )
      RETURNING id INTO v_id;
      
      -- Update NEW with the generated id
      NEW.id := v_id;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- 3. Create new update function with correct schema
  EXECUTE $sql2$
    CREATE OR REPLACE FUNCTION public.update_recipe_ingredients()
    RETURNS TRIGGER AS $func$
    BEGIN
      UPDATE stockly.recipe_ingredients SET 
        recipe_id = NEW.recipe_id,
        ingredient_id = NEW.ingredient_id,
        sub_recipe_id = NEW.sub_recipe_id,
        quantity = NEW.quantity,
        unit_id = NEW.unit_id,
        sort_order = NEW.sort_order,
        line_cost = NEW.line_cost,
        company_id = NEW.company_id,
        updated_at = NOW()
      WHERE id = NEW.id;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql2$;

  -- 4. Recreate the triggers (only if view exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    CREATE TRIGGER recipe_ingredients_insert_trigger
      INSTEAD OF INSERT ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients();

    CREATE TRIGGER recipe_ingredients_update_trigger
      INSTEAD OF UPDATE ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients();
  END IF;

  -- 5. Ensure the view itself is correct (recreate if needed)
  -- The view should already be correct from 20250108000001_fix_recipe_ingredients_final.sql
  -- But let's make sure it exists and is correct
  -- Check if view exists and has correct columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    -- View doesn't exist, create it
    CREATE VIEW public.recipe_ingredients AS
    SELECT 
      ri.id,
      ri.recipe_id,
      ri.ingredient_id,
      ri.sub_recipe_id,
      ri.quantity,
      ri.unit_id,
      ri.sort_order,
      ri.line_cost,
      ri.company_id,
      ri.created_at,
      ri.updated_at,
      -- Ingredient data (from JOIN)
      il.ingredient_name,
      il.supplier,
      il.unit_cost as ingredient_unit_cost,
      il.pack_cost,
      il.pack_size,
      il.yield_percent,
      il.allergens,
      il.is_prep_item,
      il.linked_recipe_id as ingredient_recipe_id,
      -- Unit data (from JOIN)
      u.abbreviation as unit_abbreviation,
      u.name as unit_name,
      u.base_multiplier
    FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id
      LEFT JOIN public.uom u ON u.id = ri.unit_id;
    
    -- Recreate triggers after view creation
    CREATE TRIGGER recipe_ingredients_insert_trigger
      INSTEAD OF INSERT ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients();

    CREATE TRIGGER recipe_ingredients_update_trigger
      INSTEAD OF UPDATE ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients();
  ELSE
    -- View exists, verify it uses ingredient_id (not stock_item_id)
    -- If it has stock_item_id, we need to recreate it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'recipe_ingredients' 
      AND column_name = 'stock_item_id'
    ) THEN
      -- View has wrong column, recreate it
      DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;
      
      CREATE VIEW public.recipe_ingredients AS
      SELECT 
        ri.id,
        ri.recipe_id,
        ri.ingredient_id,
        ri.sub_recipe_id,
        ri.quantity,
        ri.unit_id,
        ri.sort_order,
        ri.line_cost,
        ri.company_id,
        ri.created_at,
        ri.updated_at,
        -- Ingredient data (from JOIN)
        il.ingredient_name,
        il.supplier,
        il.unit_cost as ingredient_unit_cost,
        il.pack_cost,
        il.pack_size,
        il.yield_percent,
        il.allergens,
        il.is_prep_item,
        il.linked_recipe_id as ingredient_recipe_id,
        -- Unit data (from JOIN)
        u.abbreviation as unit_abbreviation,
        u.name as unit_name,
        u.base_multiplier
      FROM stockly.recipe_ingredients ri
      LEFT JOIN public.ingredients_library il ON il.id = ri.ingredient_id
      LEFT JOIN public.uom u ON u.id = ri.unit_id;
      
      -- Recreate triggers after view recreation
      CREATE TRIGGER recipe_ingredients_insert_trigger
        INSTEAD OF INSERT ON public.recipe_ingredients
        FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients();

      CREATE TRIGGER recipe_ingredients_update_trigger
        INSTEAD OF UPDATE ON public.recipe_ingredients
        FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients();
    END IF;
  END IF;

  -- 6. Grant permissions (only if view exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
  END IF;

END $$;

