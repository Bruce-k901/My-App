-- Remove incorrect unique constraint on recipes.name
-- Recipe names can be duplicated; recipe codes (REC-XXX-001) are the unique identifier
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping fix_recipe_name_constraint migration';
    RETURN;
  END IF;
  
  -- Check if recipes table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'stockly' 
    AND tablename = 'recipes'
  ) THEN
    RAISE NOTICE 'stockly.recipes table does not exist - skipping fix_recipe_name_constraint migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema and recipes table found - proceeding with fix_recipe_name_constraint migration';
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

  -- 1. Drop the incorrect unique constraint on name
  EXECUTE 'ALTER TABLE stockly.recipes DROP CONSTRAINT IF EXISTS recipes_name_unique';

  -- 2. Ensure code has unique constraint (this is the real identifier)
  EXECUTE 'ALTER TABLE stockly.recipes DROP CONSTRAINT IF EXISTS recipes_code_unique';

  EXECUTE 'ALTER TABLE stockly.recipes ADD CONSTRAINT recipes_code_unique UNIQUE (code, company_id)';

  -- 3. Add index on name for searching (but not unique)
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recipes_name ON stockly.recipes(name)';
END $$;

