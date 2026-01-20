-- Add INSTEAD OF DELETE trigger for recipe_ingredients view
BEGIN;

-- Drop existing delete trigger if it exists
DROP TRIGGER IF EXISTS recipe_ingredients_delete_trigger ON public.recipe_ingredients;

-- Drop existing delete function if it exists
DROP FUNCTION IF EXISTS public.delete_recipe_ingredients() CASCADE;

-- Create delete function
CREATE OR REPLACE FUNCTION public.delete_recipe_ingredients()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete from the base table
  DELETE FROM stockly.recipe_ingredients
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create INSTEAD OF DELETE trigger
CREATE TRIGGER recipe_ingredients_delete_trigger
  INSTEAD OF DELETE ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_recipe_ingredients();

COMMIT;

