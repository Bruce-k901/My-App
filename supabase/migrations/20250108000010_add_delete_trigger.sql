-- Add INSTEAD OF DELETE trigger for recipe_ingredients view
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping add_delete_trigger migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with add_delete_trigger migration';
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

  -- Drop existing delete trigger if it exists (only if view exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients;
  END IF;

  -- Drop existing delete function if it exists
  DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

  -- Create delete function
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION public.delete_recipe_ingredients()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Delete from the base table
      DELETE FROM stockly.recipe_ingredients
      WHERE id = OLD.id;
      
      RETURN OLD;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- Create INSTEAD OF DELETE trigger (only if view exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
  ) THEN
    CREATE TRIGGER recipe_ingredients_delete_trigger
      INSTEAD OF DELETE ON public.recipe_ingredients
      FOR EACH ROW
      EXECUTE FUNCTION public.delete_recipe_ingredients();
  END IF;

END $$;

