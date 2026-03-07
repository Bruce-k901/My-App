-- Fix: Recreate public.production_batch_inputs view to pick up
-- is_rework and rework_source_batch_id columns added by rework migration.
-- PostgreSQL SELECT * views snapshot columns at creation time,
-- so new columns on the underlying table are NOT included automatically.

-- Drop triggers first (they reference the view)
DROP TRIGGER IF EXISTS production_batch_inputs_insert_trigger ON public.production_batch_inputs;
DROP TRIGGER IF EXISTS production_batch_inputs_delete_trigger ON public.production_batch_inputs;

-- Recreate the view
DROP VIEW IF EXISTS public.production_batch_inputs;
CREATE VIEW public.production_batch_inputs AS
SELECT * FROM stockly.production_batch_inputs;
ALTER VIEW public.production_batch_inputs SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_inputs TO authenticated;

-- Re-attach triggers
CREATE TRIGGER production_batch_inputs_insert_trigger
  INSTEAD OF INSERT ON public.production_batch_inputs
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_batch_inputs();

CREATE TRIGGER production_batch_inputs_delete_trigger
  INSTEAD OF DELETE ON public.production_batch_inputs
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_batch_inputs();
