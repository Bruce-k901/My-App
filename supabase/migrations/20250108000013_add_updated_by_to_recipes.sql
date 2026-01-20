-- Add updated_by tracking to recipes table
BEGIN;

-- 1. Add updated_by column
ALTER TABLE stockly.recipes
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_recipes_updated_by 
  ON stockly.recipes(updated_by);

-- 3. Create trigger function to auto-set updated_by and updated_at
CREATE OR REPLACE FUNCTION set_recipe_updated_by()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

COMMIT;

