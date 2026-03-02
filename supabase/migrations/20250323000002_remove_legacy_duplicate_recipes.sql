-- ============================================================================
-- Migration: 20250323000002_remove_legacy_duplicate_recipes.sql
-- Description: Remove legacy duplicate recipes with incorrect codes (e.g., REC-CXX-001)
--              Keep recipes with proper code format and output_ingredient_id links
-- ============================================================================

DO $$
DECLARE
  v_legacy_recipe_id UUID;
  v_proper_recipe_id UUID;
  v_ingredient_id UUID;
  v_recipe_name TEXT;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' AND table_name = 'recipes'
  ) THEN
    RAISE NOTICE 'stockly schema or stockly.recipes table does not exist - skipping remove_legacy_duplicate_recipes migration';
    RETURN;
  END IF;

  -- Find and remove legacy recipes that:
  -- 1. Have code pattern like REC-CXX-%, REC-XXX-%, or other placeholder patterns
  -- 2. Have duplicate names (case-insensitive) with proper recipes
  -- 3. Don't have proper output_ingredient_id links
  
  -- Strategy: For each legacy recipe, check if there's a proper duplicate
  -- If found, archive/delete the legacy one and keep the proper one
  
  FOR v_legacy_recipe_id, v_recipe_name, v_ingredient_id IN
    SELECT 
      r.id,
      r.name,
      r.output_ingredient_id
    FROM stockly.recipes r
    WHERE r.code LIKE 'REC-CXX-%'
       OR r.code LIKE 'REC-XXX-%'
       OR r.code LIKE 'REC-OXX-%'
       OR (r.code IS NULL AND r.output_ingredient_id IS NOT NULL)
    ORDER BY r.created_at ASC
  LOOP
    -- Check if there's a proper recipe for the same ingredient
    IF v_ingredient_id IS NOT NULL THEN
      SELECT id INTO v_proper_recipe_id
      FROM stockly.recipes
      WHERE output_ingredient_id = v_ingredient_id
        AND id != v_legacy_recipe_id
        AND (code NOT LIKE 'REC-CXX-%' AND code NOT LIKE 'REC-XXX-%' AND code NOT LIKE 'REC-OXX-%')
        AND code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- If proper recipe exists, delete the legacy one
      IF v_proper_recipe_id IS NOT NULL THEN
        RAISE NOTICE 'Found duplicate: Legacy recipe % (%) and proper recipe % for ingredient %', 
          v_legacy_recipe_id::text, v_recipe_name, v_proper_recipe_id::text, v_ingredient_id::text;
        
        -- Update ingredient to point to proper recipe if it's pointing to legacy
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'ingredients_library'
        ) THEN
          UPDATE public.ingredients_library
          SET linked_recipe_id = v_proper_recipe_id
          WHERE linked_recipe_id = v_legacy_recipe_id;
        END IF;
        
        -- Delete recipe ingredients for legacy recipe first (CASCADE should handle this, but being explicit)
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'stockly' AND table_name = 'recipe_ingredients'
        ) THEN
          DELETE FROM stockly.recipe_ingredients WHERE recipe_id = v_legacy_recipe_id;
        END IF;
        
        -- Delete the legacy recipe
        DELETE FROM stockly.recipes WHERE id = v_legacy_recipe_id;
        
        v_deleted_count := v_deleted_count + 1;
        
        RAISE NOTICE 'Deleted legacy recipe % and updated ingredient links', v_legacy_recipe_id::text;
      END IF;
    ELSE
      -- No ingredient link - check by name (case-insensitive)
      SELECT id INTO v_proper_recipe_id
      FROM stockly.recipes
      WHERE LOWER(name) = LOWER(v_recipe_name)
        AND id != v_legacy_recipe_id
        AND company_id = (SELECT company_id FROM stockly.recipes WHERE id = v_legacy_recipe_id)
        AND (code NOT LIKE 'REC-CXX-%' AND code NOT LIKE 'REC-XXX-%' AND code NOT LIKE 'REC-OXX-%')
        AND code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_proper_recipe_id IS NOT NULL THEN
        RAISE NOTICE 'Found duplicate by name: Legacy recipe % (%) and proper recipe %', 
          v_legacy_recipe_id::text, v_recipe_name, v_proper_recipe_id::text;
        
        -- Get the ingredient ID from the proper recipe to update legacy ingredient links
        SELECT output_ingredient_id INTO v_ingredient_id
        FROM stockly.recipes
        WHERE id = v_proper_recipe_id;
        
        -- Update ingredient to point to proper recipe if it's pointing to legacy
        IF v_ingredient_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'ingredients_library'
        ) THEN
          UPDATE public.ingredients_library
          SET linked_recipe_id = v_proper_recipe_id
          WHERE linked_recipe_id = v_legacy_recipe_id;
        END IF;
        
        -- Delete recipe ingredients for legacy recipe
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'stockly' AND table_name = 'recipe_ingredients'
        ) THEN
          DELETE FROM stockly.recipe_ingredients WHERE recipe_id = v_legacy_recipe_id;
        END IF;
        
        -- Delete the legacy recipe
        DELETE FROM stockly.recipes WHERE id = v_legacy_recipe_id;
        
        v_deleted_count := v_deleted_count + 1;
        
        RAISE NOTICE 'Deleted legacy recipe % (matched by name) and updated ingredient links', v_legacy_recipe_id::text;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration completed: Deleted % legacy duplicate recipes', v_deleted_count;
END $$;

