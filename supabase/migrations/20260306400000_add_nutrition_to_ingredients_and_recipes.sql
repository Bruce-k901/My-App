-- ============================================================================
-- Migration: 20260306400000_add_nutrition_to_ingredients_and_recipes.sql
-- Description: Adds UK Big 7 + Fibre nutrition columns to ingredients_library,
--              JSONB nutrition fields to stockly.recipes, calculation function,
--              and auto-recalculation trigger on recipe_ingredients changes.
-- ============================================================================

-- ============================================================================
-- 1. Add nutrition columns to ingredients_library (per 100g)
-- ============================================================================
ALTER TABLE public.ingredients_library
  ADD COLUMN IF NOT EXISTS nutrition_energy_kcal NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_fat_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_saturated_fat_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_carbohydrate_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_sugars_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_fibre_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_protein_g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nutrition_salt_g NUMERIC(8,3);

COMMENT ON COLUMN public.ingredients_library.nutrition_energy_kcal IS 'Energy in kcal per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_fat_g IS 'Total fat in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_saturated_fat_g IS 'Saturated fat in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_carbohydrate_g IS 'Total carbohydrate in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_sugars_g IS 'Sugars in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_fibre_g IS 'Fibre in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_protein_g IS 'Protein in grams per 100g';
COMMENT ON COLUMN public.ingredients_library.nutrition_salt_g IS 'Salt in grams per 100g';

-- ============================================================================
-- 2. Add nutrition columns to stockly.recipes
-- ============================================================================
ALTER TABLE stockly.recipes
  ADD COLUMN IF NOT EXISTS nutrition_per_recipe JSONB,
  ADD COLUMN IF NOT EXISTS nutrition_per_portion JSONB,
  ADD COLUMN IF NOT EXISTS nutrition_per_100g JSONB,
  ADD COLUMN IF NOT EXISTS nutrition_data_complete BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN stockly.recipes.nutrition_per_recipe IS 'Total nutrition for entire recipe batch (UK Big 7 + Fibre)';
COMMENT ON COLUMN stockly.recipes.nutrition_per_portion IS 'Nutrition per portion (total / yield_qty)';
COMMENT ON COLUMN stockly.recipes.nutrition_per_100g IS 'Nutrition per 100g (scaled by total weight)';
COMMENT ON COLUMN stockly.recipes.nutrition_data_complete IS 'TRUE if all ingredients have nutrition data populated';

-- ============================================================================
-- 3. Refresh public.recipes view to include new columns
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'recipes'
  ) THEN
    DROP VIEW IF EXISTS public.recipes CASCADE;
    CREATE VIEW public.recipes AS
    SELECT * FROM stockly.recipes;
    RAISE NOTICE 'Refreshed public.recipes view to include nutrition columns';
  END IF;
END $$;

-- ============================================================================
-- 4. Recreate INSERT trigger with nutrition columns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_recipes()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO stockly.recipes (
    id, company_id, name, description, recipe_type, category_id, menu_category,
    yield_quantity, yield_unit, is_ingredient, base_unit, shelf_life_days,
    total_cost, cost_per_portion, sell_price, vat_rate, target_gp_percent,
    actual_gp_percent, use_weighted_average, pos_item_code, pos_item_name,
    is_active, is_archived, version, last_costed_at, image_url, notes,
    created_by, created_at, updated_at, recipe_status, output_ingredient_id,
    yield_qty, yield_unit_id, storage_requirements, allergens, may_contain_allergens,
    version_number, code, total_ingredient_cost, calculated_yield_qty, unit_cost,
    last_cost_calculated_at, linked_sop_id, updated_by, data_version,
    department,
    nutrition_per_recipe, nutrition_per_portion, nutrition_per_100g, nutrition_data_complete
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.name, NEW.description,
    COALESCE(NEW.recipe_type, 'dish'), NEW.category_id, NEW.menu_category,
    COALESCE(NEW.yield_quantity, 1), COALESCE(NEW.yield_unit, 'portion'),
    NEW.is_ingredient, NEW.base_unit, NEW.shelf_life_days, NEW.total_cost,
    NEW.cost_per_portion, NEW.sell_price, NEW.vat_rate, NEW.target_gp_percent,
    NEW.actual_gp_percent, NEW.use_weighted_average, NEW.pos_item_code,
    NEW.pos_item_name, COALESCE(NEW.is_active, true), COALESCE(NEW.is_archived, false),
    NEW.version, NEW.last_costed_at, NEW.image_url, NEW.notes, NEW.created_by,
    COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()),
    NEW.recipe_status, NEW.output_ingredient_id, NEW.yield_qty, NEW.yield_unit_id,
    NEW.storage_requirements, NEW.allergens, NEW.may_contain_allergens,
    NEW.version_number, NEW.code,
    NEW.total_ingredient_cost, NEW.calculated_yield_qty, NEW.unit_cost,
    NEW.last_cost_calculated_at, NEW.linked_sop_id, NEW.updated_by,
    COALESCE(NEW.data_version, 1),
    NEW.department,
    NEW.nutrition_per_recipe, NEW.nutrition_per_portion, NEW.nutrition_per_100g,
    COALESCE(NEW.nutrition_data_complete, FALSE)
  )
  RETURNING id INTO v_id;

  SELECT * INTO NEW FROM public.recipes WHERE id = v_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Recreate UPDATE trigger with nutrition columns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_recipes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stockly.recipes SET
    company_id = NEW.company_id, name = NEW.name, description = NEW.description,
    recipe_type = NEW.recipe_type, category_id = NEW.category_id,
    menu_category = NEW.menu_category, yield_quantity = NEW.yield_quantity,
    yield_unit = NEW.yield_unit, is_ingredient = NEW.is_ingredient,
    base_unit = NEW.base_unit, shelf_life_days = NEW.shelf_life_days,
    total_cost = NEW.total_cost, cost_per_portion = NEW.cost_per_portion,
    sell_price = NEW.sell_price, vat_rate = NEW.vat_rate,
    target_gp_percent = NEW.target_gp_percent, actual_gp_percent = NEW.actual_gp_percent,
    use_weighted_average = NEW.use_weighted_average, pos_item_code = NEW.pos_item_code,
    pos_item_name = NEW.pos_item_name, is_active = NEW.is_active,
    is_archived = NEW.is_archived, version = NEW.version,
    last_costed_at = NEW.last_costed_at, image_url = NEW.image_url, notes = NEW.notes,
    updated_at = COALESCE(NEW.updated_at, NOW()), recipe_status = NEW.recipe_status,
    output_ingredient_id = NEW.output_ingredient_id, yield_qty = NEW.yield_qty,
    yield_unit_id = NEW.yield_unit_id, storage_requirements = NEW.storage_requirements,
    allergens = NEW.allergens, may_contain_allergens = NEW.may_contain_allergens,
    version_number = NEW.version_number, code = NEW.code,
    total_ingredient_cost = NEW.total_ingredient_cost,
    calculated_yield_qty = NEW.calculated_yield_qty, unit_cost = NEW.unit_cost,
    last_cost_calculated_at = NEW.last_cost_calculated_at,
    linked_sop_id = NEW.linked_sop_id, updated_by = NEW.updated_by,
    data_version = NEW.data_version,
    department = NEW.department,
    nutrition_per_recipe = NEW.nutrition_per_recipe,
    nutrition_per_portion = NEW.nutrition_per_portion,
    nutrition_per_100g = NEW.nutrition_per_100g,
    nutrition_data_complete = NEW.nutrition_data_complete
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate view triggers
CREATE TRIGGER recipes_insert_trigger
  INSTEAD OF INSERT ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipes();

CREATE TRIGGER recipes_update_trigger
  INSTEAD OF UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes();

GRANT SELECT, INSERT, UPDATE ON public.recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipes TO service_role;

-- ============================================================================
-- 6. Create nutrition calculation function
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping nutrition function';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stockly'
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist - skipping nutrition function';
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS update_nutrition_on_ingredient_change ON stockly.recipe_ingredients;
  DROP FUNCTION IF EXISTS trigger_recipe_nutrition_update();
  DROP FUNCTION IF EXISTS calculate_recipe_nutrition(UUID);

  -- ==========================================================================
  -- Function: calculate_recipe_nutrition
  -- Aggregates nutrition from recipe ingredients, converts units to grams,
  -- calculates per-recipe, per-portion, and per-100g values.
  -- ==========================================================================
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION calculate_recipe_nutrition(p_recipe_id UUID)
    RETURNS void AS $func$
    DECLARE
      v_yield_qty NUMERIC;
      v_total_weight_g NUMERIC := 0;
      v_all_complete BOOLEAN := TRUE;
      v_has_any_data BOOLEAN := FALSE;
      v_energy NUMERIC := 0;
      v_fat NUMERIC := 0;
      v_sat_fat NUMERIC := 0;
      v_carb NUMERIC := 0;
      v_sugars NUMERIC := 0;
      v_fibre NUMERIC := 0;
      v_protein NUMERIC := 0;
      v_salt NUMERIC := 0;
      v_qty_g NUMERIC;
      v_total_nutrition JSONB;
      v_per_portion JSONB;
      v_per_100g JSONB;
      rec RECORD;
    BEGIN
      -- Get recipe yield
      SELECT yield_qty INTO v_yield_qty
      FROM stockly.recipes WHERE id = p_recipe_id;

      -- Iterate recipe ingredients (direct ingredients only)
      FOR rec IN
        SELECT
          ri.quantity,
          u.abbreviation AS unit_abbr,
          u.unit_type,
          u.base_multiplier,
          i.nutrition_energy_kcal,
          i.nutrition_fat_g,
          i.nutrition_saturated_fat_g,
          i.nutrition_carbohydrate_g,
          i.nutrition_sugars_g,
          i.nutrition_fibre_g,
          i.nutrition_protein_g,
          i.nutrition_salt_g,
          COALESCE(i.yield_percent, 100) AS yield_pct
        FROM stockly.recipe_ingredients ri
        JOIN public.ingredients_library i ON i.id = ri.ingredient_id
        LEFT JOIN public.uom u ON u.id = ri.unit_id
        WHERE ri.recipe_id = p_recipe_id
          AND ri.ingredient_id IS NOT NULL
      LOOP
        -- Check if ingredient has nutrition data (energy is the sentinel)
        IF rec.nutrition_energy_kcal IS NULL THEN
          v_all_complete := FALSE;
          CONTINUE;
        END IF;

        v_has_any_data := TRUE;

        -- Convert quantity to grams
        v_qty_g := CASE
          WHEN rec.unit_abbr = 'kg'    THEN rec.quantity * 1000
          WHEN rec.unit_abbr = 'g'     THEN rec.quantity
          WHEN rec.unit_abbr = 'mg'    THEN rec.quantity / 1000
          WHEN rec.unit_abbr = 'lb'    THEN rec.quantity * 453.592
          WHEN rec.unit_abbr = 'oz'    THEN rec.quantity * 28.3495
          WHEN rec.unit_abbr = 'L'     THEN rec.quantity * 1000  -- assume 1ml ~ 1g
          WHEN rec.unit_abbr = 'ml'    THEN rec.quantity
          WHEN rec.unit_abbr = 'cl'    THEN rec.quantity * 10
          WHEN rec.unit_abbr = 'pt'    THEN rec.quantity * 568.261
          WHEN rec.unit_abbr = 'gal'   THEN rec.quantity * 4546.09
          WHEN rec.unit_abbr = 'fl oz' THEN rec.quantity * 28.4131
          ELSE rec.quantity  -- count units: skip weight tracking but still calc nutrition if data exists
        END;

        -- Apply yield percent (usable portion after waste)
        v_qty_g := v_qty_g * (rec.yield_pct / 100.0);

        -- Accumulate nutrition: (qty_in_grams / 100) × nutrition_per_100g
        v_energy  := v_energy  + (v_qty_g / 100.0) * COALESCE(rec.nutrition_energy_kcal, 0);
        v_fat     := v_fat     + (v_qty_g / 100.0) * COALESCE(rec.nutrition_fat_g, 0);
        v_sat_fat := v_sat_fat + (v_qty_g / 100.0) * COALESCE(rec.nutrition_saturated_fat_g, 0);
        v_carb    := v_carb    + (v_qty_g / 100.0) * COALESCE(rec.nutrition_carbohydrate_g, 0);
        v_sugars  := v_sugars  + (v_qty_g / 100.0) * COALESCE(rec.nutrition_sugars_g, 0);
        v_fibre   := v_fibre   + (v_qty_g / 100.0) * COALESCE(rec.nutrition_fibre_g, 0);
        v_protein := v_protein + (v_qty_g / 100.0) * COALESCE(rec.nutrition_protein_g, 0);
        v_salt    := v_salt    + (v_qty_g / 100.0) * COALESCE(rec.nutrition_salt_g, 0);

        v_total_weight_g := v_total_weight_g + v_qty_g;
      END LOOP;

      -- If no ingredients have nutrition data at all, store NULLs
      IF NOT v_has_any_data THEN
        UPDATE stockly.recipes
        SET nutrition_per_recipe = NULL,
            nutrition_per_portion = NULL,
            nutrition_per_100g = NULL,
            nutrition_data_complete = FALSE
        WHERE id = p_recipe_id;
        RETURN;
      END IF;

      -- Build total nutrition JSONB
      v_total_nutrition := jsonb_build_object(
        'energy_kcal',      ROUND(v_energy, 1),
        'fat_g',            ROUND(v_fat, 1),
        'saturated_fat_g',  ROUND(v_sat_fat, 1),
        'carbohydrate_g',   ROUND(v_carb, 1),
        'sugars_g',         ROUND(v_sugars, 1),
        'fibre_g',          ROUND(v_fibre, 1),
        'protein_g',        ROUND(v_protein, 1),
        'salt_g',           ROUND(v_salt, 2)
      );

      -- Per portion
      IF v_yield_qty IS NOT NULL AND v_yield_qty > 0 THEN
        v_per_portion := jsonb_build_object(
          'energy_kcal',      ROUND(v_energy / v_yield_qty, 1),
          'fat_g',            ROUND(v_fat / v_yield_qty, 1),
          'saturated_fat_g',  ROUND(v_sat_fat / v_yield_qty, 1),
          'carbohydrate_g',   ROUND(v_carb / v_yield_qty, 1),
          'sugars_g',         ROUND(v_sugars / v_yield_qty, 1),
          'fibre_g',          ROUND(v_fibre / v_yield_qty, 1),
          'protein_g',        ROUND(v_protein / v_yield_qty, 1),
          'salt_g',           ROUND(v_salt / v_yield_qty, 2)
        );
      ELSE
        v_per_portion := v_total_nutrition;
      END IF;

      -- Per 100g (scale by total weight)
      IF v_total_weight_g > 0 THEN
        v_per_100g := jsonb_build_object(
          'energy_kcal',      ROUND((v_energy / v_total_weight_g) * 100, 1),
          'fat_g',            ROUND((v_fat / v_total_weight_g) * 100, 1),
          'saturated_fat_g',  ROUND((v_sat_fat / v_total_weight_g) * 100, 1),
          'carbohydrate_g',   ROUND((v_carb / v_total_weight_g) * 100, 1),
          'sugars_g',         ROUND((v_sugars / v_total_weight_g) * 100, 1),
          'fibre_g',          ROUND((v_fibre / v_total_weight_g) * 100, 1),
          'protein_g',        ROUND((v_protein / v_total_weight_g) * 100, 1),
          'salt_g',           ROUND((v_salt / v_total_weight_g) * 100, 2)
        );
      ELSE
        v_per_100g := v_total_nutrition;
      END IF;

      -- Update recipe
      UPDATE stockly.recipes
      SET nutrition_per_recipe = v_total_nutrition,
          nutrition_per_portion = v_per_portion,
          nutrition_per_100g = v_per_100g,
          nutrition_data_complete = v_all_complete
      WHERE id = p_recipe_id;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- ==========================================================================
  -- Trigger function: fires on recipe_ingredients changes
  -- ==========================================================================
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION trigger_recipe_nutrition_update()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM calculate_recipe_nutrition(OLD.recipe_id);
      ELSE
        PERFORM calculate_recipe_nutrition(NEW.recipe_id);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- ==========================================================================
  -- Create trigger on stockly.recipe_ingredients
  -- ==========================================================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stockly'
    AND table_name = 'recipe_ingredients'
    AND table_type = 'BASE TABLE'
  ) THEN
    CREATE TRIGGER update_nutrition_on_ingredient_change
      AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION trigger_recipe_nutrition_update();
  END IF;

  RAISE NOTICE 'Recipe nutrition calculation migration completed successfully';
END $$;

-- ============================================================================
-- 7. Backfill existing recipes
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM stockly.recipes LOOP
    PERFORM calculate_recipe_nutrition(r.id);
  END LOOP;
  RAISE NOTICE 'Backfilled nutrition for all existing recipes';
END $$;

NOTIFY pgrst, 'reload schema';
