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

NOTIFY pgrst, 'reload schema';
