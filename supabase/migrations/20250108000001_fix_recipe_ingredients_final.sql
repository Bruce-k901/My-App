-- Final standardization of recipe_ingredients schema
-- This migration only runs if stockly schema and recipe_ingredients table exist
DO $$
BEGIN
  -- Check if stockly schema exists using pg_namespace (more reliable)
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping recipe_ingredients migration';
    RETURN;
  END IF;
  
  -- Check if recipe_ingredients table exists - only check if schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    RAISE NOTICE 'stockly.recipe_ingredients table does not exist - skipping migration';
    RETURN;
  END IF;
  
  -- If we get here, schema and table exist, so proceed with migration
  RAISE NOTICE 'stockly schema and recipe_ingredients table found - proceeding with migration';
END $$;

-- Only proceed if schema and table exist (checked above)
-- All subsequent operations are wrapped in individual DO blocks with their own checks

-- 1. Ensure ingredient_id column exists (rename from stock_item_id if needed)
DO $$ 
BEGIN
  -- Check if stockly schema and table exist using pg catalog
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    RETURN;
  END IF;
  
  -- Check if stock_item_id exists but ingredient_id doesn't
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stockly' 
    AND c.relname = 'recipe_ingredients' 
    AND a.attname = 'stock_item_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stockly' 
    AND c.relname = 'recipe_ingredients' 
    AND a.attname = 'ingredient_id'
  ) THEN
    -- Drop old foreign key if exists (using dynamic SQL to avoid schema validation)
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_stock_item_id_fkey';
    
    -- Rename column
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients RENAME COLUMN stock_item_id TO ingredient_id';
    
    -- Update constraint name
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients DROP CONSTRAINT IF EXISTS ingredient_source';
    
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD CONSTRAINT ingredient_source CHECK (
        (ingredient_id IS NOT NULL AND sub_recipe_id IS NULL) OR
        (ingredient_id IS NULL AND sub_recipe_id IS NOT NULL)
      )';
    
    -- Add foreign key to ingredients_library if table exists
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'ingredients_library'
    ) THEN
      EXECUTE 'ALTER TABLE stockly.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
          FOREIGN KEY (ingredient_id)
          REFERENCES public.ingredients_library(id)
          ON DELETE CASCADE';
    END IF;
  END IF;
  
  -- Ensure ingredient_id column exists (add if neither stock_item_id nor ingredient_id exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stockly' 
    AND c.relname = 'recipe_ingredients' 
    AND a.attname = 'ingredient_id'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD COLUMN ingredient_id UUID';
    
    -- Add foreign key if ingredients_library exists
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'ingredients_library'
    ) THEN
      EXECUTE 'ALTER TABLE stockly.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
          FOREIGN KEY (ingredient_id)
          REFERENCES public.ingredients_library(id)
          ON DELETE CASCADE';
    END IF;
  END IF;
END $$;

-- 2. Remove TEXT unit column if exists (we use unit_id UUID instead)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients DROP COLUMN IF EXISTS unit CASCADE';
  END IF;
END $$;
  
-- 3. Ensure unit_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.uom(id)';
  END IF;
END $$;

-- 4. Standardize on sort_order (rename display_order if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) AND EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stockly' 
    AND c.relname = 'recipe_ingredients' 
    AND a.attname = 'display_order'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients RENAME COLUMN display_order TO sort_order';
  END IF;
END $$;

-- 5. Ensure sort_order exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD COLUMN IF NOT EXISTS sort_order INTEGER';
  END IF;
END $$;

-- 6. Add line_cost for real-time calculation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD COLUMN IF NOT EXISTS line_cost DECIMAL(12,4)';
  END IF;
END $$;

-- 7. Add company_id if it doesn't exist (for multi-tenant support)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'ALTER TABLE stockly.recipe_ingredients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE';
  END IF;
END $$;

-- 8. Create comprehensive view with all JOINs for efficient loading
-- Handle both stock_item_id and ingredient_id for compatibility
DO $$
BEGIN
  -- Check if stockly schema and table exist using pg catalog
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    RETURN;
  END IF;
  
  -- Verify ingredient_id exists (should have been created/renamed in step 1)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'stockly' 
    AND c.relname = 'recipe_ingredients' 
    AND a.attname = 'ingredient_id'
  ) THEN
    -- If still using stock_item_id, rename it now
    IF EXISTS (
      SELECT 1 FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'stockly' 
      AND c.relname = 'recipe_ingredients' 
      AND a.attname = 'stock_item_id'
    ) THEN
      EXECUTE 'ALTER TABLE stockly.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_stock_item_id_fkey';
      
      EXECUTE 'ALTER TABLE stockly.recipe_ingredients RENAME COLUMN stock_item_id TO ingredient_id';
      
      -- Add foreign key if ingredients_library exists
      IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'ingredients_library'
      ) THEN
        EXECUTE 'ALTER TABLE stockly.recipe_ingredients
          ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
            FOREIGN KEY (ingredient_id)
            REFERENCES public.ingredients_library(id)
            ON DELETE CASCADE';
      END IF;
    ELSE
      RAISE EXCEPTION 'Neither ingredient_id nor stock_item_id exists in stockly.recipe_ingredients. Table structure is unexpected.';
    END IF;
  END IF;
END $$;

-- Only create view if stockly schema and table exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    DROP VIEW IF EXISTS public.recipe_ingredients CASCADE;

    EXECUTE '
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
    ';
  END IF;
END $$;

-- 9. Update INSTEAD OF triggers to use new schema (unit_id, sort_order, ingredient_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    DROP TRIGGER IF EXISTS recipe_ingredients_insert_trigger ON public.recipe_ingredients;
    DROP TRIGGER IF EXISTS recipe_ingredients_update_trigger ON public.recipe_ingredients;

    EXECUTE 'DROP FUNCTION IF EXISTS public.insert_recipe_ingredients()';
    EXECUTE 'DROP FUNCTION IF EXISTS public.update_recipe_ingredients()';

    -- New insert function with updated schema (using dynamic SQL to avoid schema validation during parsing)
    EXECUTE '
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
    ';

    -- New update function with updated schema (using dynamic SQL)
    EXECUTE '
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
    ';

    -- Recreate triggers
    EXECUTE 'CREATE TRIGGER recipe_ingredients_insert_trigger
      INSTEAD OF INSERT ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.insert_recipe_ingredients()';

    EXECUTE 'CREATE TRIGGER recipe_ingredients_update_trigger
      INSTEAD OF UPDATE ON public.recipe_ingredients
      FOR EACH ROW EXECUTE FUNCTION public.update_recipe_ingredients()';
  END IF;
END $$;

-- 10. Grant permissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'recipe_ingredients'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated';
  END IF;
END $$;

-- 11. Add performance indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipe_ingredients'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_sort ON stockly.recipe_ingredients(recipe_id, sort_order)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_unit ON stockly.recipe_ingredients(unit_id)';
  END IF;
END $$;

