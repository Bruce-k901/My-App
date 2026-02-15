-- Add updated_by tracking to recipes table
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping add_updated_by_to_recipes migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with add_updated_by_to_recipes migration';
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

  -- 1. Add updated_by column
  ALTER TABLE stockly.recipes
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

  -- 2. Add index for performance
  CREATE INDEX IF NOT EXISTS idx_recipes_updated_by 
    ON stockly.recipes(updated_by);

  -- 3. Create trigger function to auto-set updated_by and updated_at
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION set_recipe_updated_by()
    RETURNS TRIGGER AS $func$
    BEGIN
      -- Set updated_at to current timestamp
      NEW.updated_at = NOW();
      
      -- Set updated_by to current user (if available in session)
      -- This will be set by the application, but we ensure updated_at is always set
      IF NEW.updated_by IS NULL THEN
        NEW.updated_by = auth.uid();
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- 4. Create trigger (only on UPDATE, not INSERT)
  DROP TRIGGER IF EXISTS set_updated_by_on_update ON stockly.recipes;

  CREATE TRIGGER set_updated_by_on_update
    BEFORE UPDATE ON stockly.recipes
    FOR EACH ROW
    EXECUTE FUNCTION set_recipe_updated_by();

  -- 5. Add foreign key constraint name for JOIN
  ALTER TABLE stockly.recipes
    DROP CONSTRAINT IF EXISTS recipes_created_by_fkey;

  ALTER TABLE stockly.recipes
    ADD CONSTRAINT recipes_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;

  ALTER TABLE stockly.recipes
    DROP CONSTRAINT IF EXISTS recipes_updated_by_fkey;

  ALTER TABLE stockly.recipes
    ADD CONSTRAINT recipes_updated_by_fkey
      FOREIGN KEY (updated_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;

END $$;

