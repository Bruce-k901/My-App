-- Fix: Update the INSTEAD OF INSERT trigger for production_batch_inputs
-- to include is_rework and rework_source_batch_id columns added by rework migration
CREATE OR REPLACE FUNCTION public.insert_production_batch_inputs()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO stockly.production_batch_inputs (
    id, company_id, production_batch_id, stock_batch_id, stock_item_id,
    planned_quantity, actual_quantity, unit, added_at, added_by,
    is_rework, rework_source_batch_id
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.company_id, NEW.production_batch_id, NEW.stock_batch_id, NEW.stock_item_id,
    NEW.planned_quantity, NEW.actual_quantity, NEW.unit,
    COALESCE(NEW.added_at, NOW()), NEW.added_by,
    COALESCE(NEW.is_rework, FALSE), NEW.rework_source_batch_id
  )
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
