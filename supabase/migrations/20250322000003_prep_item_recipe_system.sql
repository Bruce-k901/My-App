-- ============================================================================
-- Migration: 20250322000003_prep_item_recipe_system.sql
-- Description: Adds prep item recipe system fields to recipes, sop_entries, and ingredients_library
-- ============================================================================

DO $$
BEGIN
  -- ============================================================================
  -- INGREDIENTS_LIBRARY: Add linked_recipe_id
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
    -- Add linked_recipe_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ingredients_library' 
      AND column_name = 'linked_recipe_id'
    ) THEN
      ALTER TABLE public.ingredients_library
        ADD COLUMN linked_recipe_id UUID;
      
      -- Add foreign key constraint if recipes table exists in stockly schema
      -- (public.recipes is a view, so we reference stockly.recipes)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE public.ingredients_library
            ADD CONSTRAINT ingredients_library_linked_recipe_id_fkey
            FOREIGN KEY (linked_recipe_id) REFERENCES stockly.recipes(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            -- Constraint already exists, skip
            NULL;
        END;
      END IF;
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_ingredients_library_linked_recipe_id 
        ON public.ingredients_library(linked_recipe_id) 
        WHERE linked_recipe_id IS NOT NULL;
    END IF;
  END IF;

  -- ============================================================================
  -- RECIPES: Add new fields for prep item system
  -- Note: public.recipes is a VIEW, so we need to alter stockly.recipes
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'recipes' 
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Add recipe_status
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'recipe_status'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN recipe_status TEXT DEFAULT 'draft' 
        CHECK (recipe_status IN ('draft', 'active', 'archived'));
    END IF;

    -- Add output_ingredient_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'output_ingredient_id'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN output_ingredient_id UUID;
      
      -- Add foreign key if ingredients_library exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ingredients_library' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE stockly.recipes
            ADD CONSTRAINT recipes_output_ingredient_id_fkey
            FOREIGN KEY (output_ingredient_id) REFERENCES public.ingredients_library(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            -- Constraint already exists, skip
            NULL;
        END;
      END IF;
    END IF;

    -- Add yield_qty (separate from output_qty - yield is recipe-specific, output is portion-specific)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'yield_qty'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN yield_qty NUMERIC(10,3) DEFAULT 1;
    END IF;

    -- Add yield_unit_id (separate from output_unit_id)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'yield_unit_id'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN yield_unit_id UUID;
      
      -- Add foreign key if uom table exists
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'uom' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE stockly.recipes
            ADD CONSTRAINT recipes_yield_unit_id_fkey
            FOREIGN KEY (yield_unit_id) REFERENCES public.uom(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END;
      END IF;
    END IF;

    -- Add shelf_life_days
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'shelf_life_days'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN shelf_life_days INTEGER;
    END IF;

    -- Add storage_requirements
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'storage_requirements'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN storage_requirements TEXT;
    END IF;

    -- Add allergens (TEXT array)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'allergens'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN allergens TEXT[];
    END IF;

    -- Add version_number
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'version_number'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN version_number NUMERIC(5,1) DEFAULT 1.0;
    END IF;

    -- Add archived_from_recipe_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'archived_from_recipe_id'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN archived_from_recipe_id UUID;
      
      -- Self-referencing foreign key
      BEGIN
        ALTER TABLE stockly.recipes
          ADD CONSTRAINT recipes_archived_from_recipe_id_fkey
          FOREIGN KEY (archived_from_recipe_id) REFERENCES stockly.recipes(id) ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN
          NULL;
      END;
    END IF;

    -- Add archived_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'archived_at'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    -- Add archived_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'recipes' 
      AND column_name = 'archived_by'
    ) THEN
      ALTER TABLE stockly.recipes
        ADD COLUMN archived_by UUID;
      
      -- Foreign key to profiles (using profiles, not auth.users as per project conventions)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE stockly.recipes
            ADD CONSTRAINT recipes_archived_by_fkey
            FOREIGN KEY (archived_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END;
      END IF;
    END IF;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_recipes_output_ingredient_id 
      ON stockly.recipes(output_ingredient_id) 
      WHERE output_ingredient_id IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_recipes_recipe_status 
      ON stockly.recipes(recipe_status, company_id);
    
    CREATE INDEX IF NOT EXISTS idx_recipes_archived_from_recipe_id 
      ON stockly.recipes(archived_from_recipe_id) 
      WHERE archived_from_recipe_id IS NOT NULL;
  END IF;

  -- ============================================================================
  -- SOP_ENTRIES: Add new fields for prep item system
  -- ============================================================================
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sop_entries' 
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Add linked_recipe_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sop_entries' 
      AND column_name = 'linked_recipe_id'
    ) THEN
      ALTER TABLE public.sop_entries
        ADD COLUMN linked_recipe_id UUID;
      
      -- Add foreign key if recipes table exists in stockly schema
      -- (public.recipes is a view, so we reference stockly.recipes)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'stockly' 
        AND table_name = 'recipes' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE public.sop_entries
            ADD CONSTRAINT sop_entries_linked_recipe_id_fkey
            FOREIGN KEY (linked_recipe_id) REFERENCES stockly.recipes(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS idx_sop_entries_linked_recipe_id 
        ON public.sop_entries(linked_recipe_id) 
        WHERE linked_recipe_id IS NOT NULL;
    END IF;

    -- Add version_number (DECIMAL, separate from existing version TEXT field)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sop_entries' 
      AND column_name = 'version_number'
    ) THEN
      ALTER TABLE public.sop_entries
        ADD COLUMN version_number NUMERIC(5,1) DEFAULT 1.0;
    END IF;

    -- Add archived_from_sop_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sop_entries' 
      AND column_name = 'archived_from_sop_id'
    ) THEN
      ALTER TABLE public.sop_entries
        ADD COLUMN archived_from_sop_id UUID;
      
      -- Self-referencing foreign key
      ALTER TABLE public.sop_entries
        ADD CONSTRAINT sop_entries_archived_from_sop_id_fkey
        FOREIGN KEY (archived_from_sop_id) REFERENCES public.sop_entries(id) ON DELETE SET NULL;
    END IF;

    -- Add archived_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sop_entries' 
      AND column_name = 'archived_at'
    ) THEN
      ALTER TABLE public.sop_entries
        ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    -- Add archived_by
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sop_entries' 
      AND column_name = 'archived_by'
    ) THEN
      ALTER TABLE public.sop_entries
        ADD COLUMN archived_by UUID;
      
      -- Foreign key to profiles
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND table_type = 'BASE TABLE'
      ) THEN
        BEGIN
          ALTER TABLE public.sop_entries
            ADD CONSTRAINT sop_entries_archived_by_fkey
            FOREIGN KEY (archived_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END;
      END IF;
    END IF;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sop_entries_archived_from_sop_id 
      ON public.sop_entries(archived_from_sop_id) 
      WHERE archived_from_sop_id IS NOT NULL;
  END IF;

  -- ============================================================================
  -- Create index for ingredients_library is_prep_item lookup
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'ingredients_library' 
      AND column_name = 'is_prep_item'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_ingredients_is_prep 
        ON public.ingredients_library(is_prep_item, company_id) 
        WHERE is_prep_item = true;
    END IF;
  END IF;

  -- Notify PostgREST to reload schema
  NOTIFY pgrst, 'reload schema';
  
  RAISE NOTICE 'Prep item recipe system schema migration completed successfully';
END $$;

