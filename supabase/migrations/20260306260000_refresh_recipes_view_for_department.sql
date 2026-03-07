-- Refresh public.recipes view to include the department column
-- PostgreSQL SELECT * in views is expanded at creation time, so we must recreate
-- the view for newly added columns to appear.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'recipes'
  ) THEN
    DROP VIEW IF EXISTS public.recipes CASCADE;
    CREATE VIEW public.recipes AS
    SELECT * FROM stockly.recipes;
    RAISE NOTICE 'Refreshed public.recipes view to include department column';
  END IF;
END $$;

-- Recreate INSTEAD OF triggers (CASCADE drops them with the view)
CREATE TRIGGER recipes_insert_trigger
  INSTEAD OF INSERT ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.insert_recipes();

CREATE TRIGGER recipes_update_trigger
  INSTEAD OF UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_recipes();

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recipes TO service_role;

NOTIFY pgrst, 'reload schema';
