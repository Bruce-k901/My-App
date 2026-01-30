-- Link recipes to SOPs with smart update detection
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping recipe_sop_linking migration';
    RETURN;
  END IF;
  
  -- Check if recipes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipes'
  ) THEN
    RAISE NOTICE 'stockly.recipes table does not exist - skipping recipe_sop_linking migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema and recipes table found - proceeding with recipe_sop_linking migration';
END $$;

-- Only proceed if schema and table exist (checked above)
DO $$
BEGIN
  -- Check if stockly schema and recipes table exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipes'
  ) THEN
    RETURN;
  END IF;

  -- 1. Add SOP link to recipes (if not exists)
  EXECUTE 'ALTER TABLE stockly.recipes
    ADD COLUMN IF NOT EXISTS linked_sop_id UUID REFERENCES public.sop_entries(id) ON DELETE SET NULL';

  -- 2. Add recipe link to SOPs (if not exists)
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'sop_entries'
  ) THEN
    EXECUTE 'ALTER TABLE public.sop_entries
      ADD COLUMN IF NOT EXISTS linked_recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL';

    -- 3. Add SOP update tracking flags
    EXECUTE 'ALTER TABLE public.sop_entries
      ADD COLUMN IF NOT EXISTS needs_update BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_synced_with_recipe_at TIMESTAMPTZ';
  END IF;

  -- 4. Function to detect if SOP needs updating based on recipe changes
  EXECUTE '
  CREATE OR REPLACE FUNCTION check_sop_needs_update(p_recipe_id UUID)
  RETURNS BOOLEAN AS $func$
  DECLARE
    v_sop_last_synced TIMESTAMPTZ;
    v_recipe_last_updated TIMESTAMPTZ;
    v_ingredients_changed BOOLEAN;
  BEGIN
    -- Get SOP''s last sync time
    SELECT last_synced_with_recipe_at
    INTO v_sop_last_synced
    FROM public.sop_entries
    WHERE linked_recipe_id = p_recipe_id;
    
    IF v_sop_last_synced IS NULL THEN
      RETURN false; -- No SOP linked yet
    END IF;
    
    -- Get recipe''s last update time
    SELECT updated_at
    INTO v_recipe_last_updated
    FROM stockly.recipes
    WHERE id = p_recipe_id;
    
    -- Check if ingredients added/removed/changed since last sync
    SELECT EXISTS (
      SELECT 1 
      FROM stockly.recipe_ingredients
      WHERE recipe_id = p_recipe_id
        AND (created_at > v_sop_last_synced 
             OR updated_at > v_sop_last_synced)
    ) INTO v_ingredients_changed;
    
    -- SOP needs update if ingredients changed or recipe updated after last sync
    RETURN v_ingredients_changed OR (v_recipe_last_updated > COALESCE(v_sop_last_synced, ''1970-01-01''::TIMESTAMPTZ));
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  ';

  -- 5. Trigger to flag SOP when recipe ingredients change
  EXECUTE '
  CREATE OR REPLACE FUNCTION trigger_flag_sop_update()
  RETURNS TRIGGER AS $func$
  DECLARE
    v_linked_sop_id UUID;
    v_needs_update BOOLEAN;
    v_recipe_id UUID;
  BEGIN
    -- Get recipe_id from the trigger
    IF TG_OP = ''DELETE'' THEN
      v_recipe_id := OLD.recipe_id;
    ELSE
      v_recipe_id := NEW.recipe_id;
    END IF;
    
    -- Get linked SOP
    SELECT linked_sop_id INTO v_linked_sop_id
    FROM stockly.recipes
    WHERE id = v_recipe_id;
    
    -- If SOP exists, check if it needs updating
    IF v_linked_sop_id IS NOT NULL THEN
      v_needs_update := check_sop_needs_update(v_recipe_id);
      
      UPDATE public.sop_entries
      SET needs_update = v_needs_update
      WHERE id = v_linked_sop_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql;
  ';

  EXECUTE 'DROP TRIGGER IF EXISTS flag_sop_on_recipe_change ON stockly.recipe_ingredients';

  EXECUTE 'CREATE TRIGGER flag_sop_on_recipe_change
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_flag_sop_update()';
END $$;

