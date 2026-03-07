-- Add output_type to production_batch_outputs for byproduct/waste tracking
-- Values: 'finished_product' (default), 'byproduct', 'waste'

-- 1. Add column to underlying table
ALTER TABLE stockly.production_batch_outputs
  ADD COLUMN IF NOT EXISTS output_type TEXT NOT NULL DEFAULT 'finished_product'
    CHECK (output_type IN ('finished_product', 'byproduct', 'waste'));

-- 2. Make batch_code nullable (waste doesn't need one)
ALTER TABLE stockly.production_batch_outputs
  ALTER COLUMN batch_code DROP NOT NULL;

-- 3. Refresh the public view (SELECT * snapshots columns at creation time)
DROP TRIGGER IF EXISTS production_batch_outputs_insert_trigger ON public.production_batch_outputs;
DROP TRIGGER IF EXISTS production_batch_outputs_delete_trigger ON public.production_batch_outputs;

DROP VIEW IF EXISTS public.production_batch_outputs;
CREATE VIEW public.production_batch_outputs AS
SELECT * FROM stockly.production_batch_outputs;
ALTER VIEW public.production_batch_outputs SET (security_invoker = true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_outputs TO authenticated;

-- 4. Update INSTEAD OF INSERT trigger to include output_type
CREATE OR REPLACE FUNCTION public.insert_production_batch_outputs()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_batch_outputs (
    id, company_id, production_batch_id, stock_item_id,
    batch_code, quantity, unit, use_by_date, best_before_date,
    output_type, created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.production_batch_id, NEW.stock_item_id,
    NEW.batch_code, NEW.quantity, NEW.unit, NEW.use_by_date, NEW.best_before_date,
    COALESCE(NEW.output_type, 'finished_product'),
    COALESCE(NEW.created_at, NOW())
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-attach triggers
CREATE TRIGGER production_batch_outputs_insert_trigger
  INSTEAD OF INSERT ON public.production_batch_outputs
  FOR EACH ROW EXECUTE FUNCTION public.insert_production_batch_outputs();

CREATE TRIGGER production_batch_outputs_delete_trigger
  INSTEAD OF DELETE ON public.production_batch_outputs
  FOR EACH ROW EXECUTE FUNCTION public.delete_production_batch_outputs();

NOTIFY pgrst, 'reload schema';
