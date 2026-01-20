-- ============================================================================
-- Migration: Create Recipes Tables
-- Description: Recipes, ingredients, and circular reference guard
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and uom tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uom') THEN

    -- ============================================================================
    -- RECIPES
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      
      recipe_type TEXT NOT NULL CHECK (recipe_type IN (
        'menu_item', 'sub_recipe', 'prep_item', 'batch'
      )),
      
      category_id UUID,
      
      output_qty DECIMAL(10,3) NOT NULL,
      output_unit_id UUID NOT NULL,
      portion_size DECIMAL(10,3),
      portions_per_batch DECIMAL(10,2),
      
      yield_percent DECIMAL(5,2) DEFAULT 100.00,
      yield_notes TEXT,
      
      creates_stock_item_id UUID,
      
      ingredient_cost DECIMAL(10,2),
      cost_per_portion DECIMAL(10,4),
      cost_updated_at TIMESTAMPTZ,
      
      menu_price DECIMAL(10,2),
      target_gp_percent DECIMAL(5,2) DEFAULT 70.00,
      actual_gp_percent DECIMAL(5,2),
      
      method_steps JSONB,
      prep_time_mins INTEGER,
      cook_time_mins INTEGER,
      
      pos_product_id TEXT,
      pos_category TEXT,
      
      is_active BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(company_id, name)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'recipes_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'recipes'
    ) THEN
      ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_categories') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipes_category_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipes'
      ) THEN
        ALTER TABLE public.recipes
        ADD CONSTRAINT recipes_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.stock_categories(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'recipes_output_unit_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'recipes'
    ) THEN
      ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_output_unit_id_fkey
      FOREIGN KEY (output_unit_id) REFERENCES public.uom(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipes_creates_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipes'
      ) THEN
        ALTER TABLE public.recipes
        ADD CONSTRAINT recipes_creates_stock_item_id_fkey
        FOREIGN KEY (creates_stock_item_id) REFERENCES public.stock_items(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_recipes_company ON public.recipes(company_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_type ON public.recipes(recipe_type);
    CREATE INDEX IF NOT EXISTS idx_recipes_creates_stock ON public.recipes(creates_stock_item_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_pos ON public.recipes(pos_product_id);

    -- ============================================================================
    -- RECIPE INGREDIENTS
    -- ============================================================================
    -- Only create if recipes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
      CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID NOT NULL,
        
        stock_item_id UUID,
        sub_recipe_id UUID,
        
        quantity DECIMAL(10,4) NOT NULL,
        unit_id UUID NOT NULL,
        
        prep_notes TEXT,
        
        unit_cost DECIMAL(10,4),
        line_cost DECIMAL(10,2),
        
        sort_order INTEGER DEFAULT 0,
        
        CONSTRAINT ingredient_type CHECK (
          (stock_item_id IS NOT NULL AND sub_recipe_id IS NULL) OR
          (stock_item_id IS NULL AND sub_recipe_id IS NOT NULL)
        ),
        CONSTRAINT no_self_reference CHECK (sub_recipe_id != recipe_id)
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_ingredients_recipe_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipe_ingredients'
      ) THEN
        ALTER TABLE public.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_recipe_id_fkey
        FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'recipe_ingredients_stock_item_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'recipe_ingredients'
        ) THEN
          ALTER TABLE public.recipe_ingredients
          ADD CONSTRAINT recipe_ingredients_stock_item_id_fkey
          FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_ingredients_sub_recipe_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipe_ingredients'
      ) THEN
        ALTER TABLE public.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_sub_recipe_id_fkey
        FOREIGN KEY (sub_recipe_id) REFERENCES public.recipes(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recipe_ingredients_unit_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'recipe_ingredients'
      ) THEN
        ALTER TABLE public.recipe_ingredients
        ADD CONSTRAINT recipe_ingredients_unit_id_fkey
        FOREIGN KEY (unit_id) REFERENCES public.uom(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_stock ON public.recipe_ingredients(stock_item_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_sub ON public.recipe_ingredients(sub_recipe_id);

      -- Circular reference guard function
      CREATE OR REPLACE FUNCTION check_recipe_circular_ref()
      RETURNS TRIGGER AS $function$
      DECLARE
        v_chain UUID[];
        v_current UUID;
      BEGIN
        IF NEW.sub_recipe_id IS NULL THEN
          RETURN NEW;
        END IF;
        
        v_chain := ARRAY[NEW.recipe_id];
        v_current := NEW.sub_recipe_id;
        
        WHILE v_current IS NOT NULL LOOP
          IF v_current = ANY(v_chain) THEN
            RAISE EXCEPTION 'Circular recipe reference detected: % would create a loop', 
              array_to_string(v_chain || v_current, ' -> ');
          END IF;
          
          v_chain := v_chain || v_current;
          
          SELECT DISTINCT ri.sub_recipe_id INTO v_current
          FROM public.recipe_ingredients ri
          WHERE ri.recipe_id = v_current
            AND ri.sub_recipe_id IS NOT NULL
          LIMIT 1;
          
          IF array_length(v_chain, 1) > 20 THEN
            RAISE EXCEPTION 'Recipe chain too deep (>20 levels)';
          END IF;
        END LOOP;
        
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql;

      -- Create trigger conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trg_recipe_circular_check' 
        AND event_object_schema = 'public' 
        AND event_object_table = 'recipe_ingredients'
      ) THEN
        CREATE TRIGGER trg_recipe_circular_check
        BEFORE INSERT OR UPDATE ON public.recipe_ingredients
        FOR EACH ROW EXECUTE FUNCTION check_recipe_circular_ref();
      END IF;
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or uom tables do not exist yet - skipping recipes tables creation';
  END IF;
END $$;

