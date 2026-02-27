-- @salsa - SALSA Compliance: Rework tracking for production batches
-- Enables tracking of reworked materials (trimmings, overproduction) reused in new production batches
-- Maintains full allergen chain traceability through rework links

-- 1. Add 'rework' to batch_movements movement_type CHECK constraint
ALTER TABLE stockly.batch_movements
  DROP CONSTRAINT IF EXISTS batch_movements_movement_type_check;

ALTER TABLE stockly.batch_movements
  ADD CONSTRAINT batch_movements_movement_type_check
  CHECK (movement_type IN ('received', 'consumed_production', 'consumed_waste', 'adjustment', 'transfer', 'recalled', 'rework'));

-- 2. Add rework_source_batch_id to production_batch_inputs
-- Links back to the production batch that originally produced the rework material
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
    AND table_name = 'production_batch_inputs'
    AND column_name = 'rework_source_batch_id'
  ) THEN
    ALTER TABLE stockly.production_batch_inputs
      ADD COLUMN rework_source_batch_id UUID
      REFERENCES stockly.production_batches(id) ON DELETE SET NULL;
    COMMENT ON COLUMN stockly.production_batch_inputs.rework_source_batch_id IS
      '@salsa Rework: if this input came from a previous production batch output (rework), link to that production batch for full allergen chain traceability';
  END IF;
END $$;

-- 3. Add is_rework flag to production_batch_inputs for quick filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
    AND table_name = 'production_batch_inputs'
    AND column_name = 'is_rework'
  ) THEN
    ALTER TABLE stockly.production_batch_inputs
      ADD COLUMN is_rework BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 4. Index for rework queries
CREATE INDEX IF NOT EXISTS idx_production_batch_inputs_rework
  ON stockly.production_batch_inputs (rework_source_batch_id)
  WHERE is_rework = TRUE;

-- 5. Update the INSTEAD OF INSERT trigger to include rework columns
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

NOTIFY pgrst, 'reload schema';
