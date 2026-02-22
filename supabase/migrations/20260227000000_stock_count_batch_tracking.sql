-- @salsa - SALSA Compliance: Per-batch stock counting
-- ============================================================================
-- Migration: Stock Count Batch Tracking
-- Description: Adds batch_id to stock_count_items so stock counts can track
--              individual batches. Updates the public view, triggers, and RPC
--              to support per-batch counting and finalization.
-- ============================================================================

-- ============================================================================
-- 1. Add batch_id column to stockly.stock_count_items
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
      AND table_name = 'stock_count_items'
      AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE stockly.stock_count_items
      ADD COLUMN batch_id UUID REFERENCES stockly.stock_batches(id) ON DELETE SET NULL;
    RAISE NOTICE '+ Added batch_id column to stockly.stock_count_items';
  ELSE
    RAISE NOTICE '= batch_id column already exists in stockly.stock_count_items';
  END IF;
END $$;

-- Index for batch lookups
CREATE INDEX IF NOT EXISTS idx_stock_count_items_batch
  ON stockly.stock_count_items(batch_id)
  WHERE batch_id IS NOT NULL;

-- Partial unique: one row per batch per count
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_count_items_batch
  ON stockly.stock_count_items(stock_count_id, batch_id)
  WHERE batch_id IS NOT NULL;

-- Drop old unique constraint on (stock_count_id, ingredient_id) if it exists
-- (we now allow multiple rows per ingredient when they have different batch_ids)
DO $$
BEGIN
  -- Try dropping various possible constraint/index names
  DROP INDEX IF EXISTS stockly.stock_count_items_stock_count_id_ingredient_id_key;
  DROP INDEX IF EXISTS stockly.uq_stock_count_items_ingredient;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No old unique constraints to drop (OK)';
END $$;

-- ============================================================================
-- 2. Recreate public.stock_count_items VIEW to include batch_id + batch data
-- ============================================================================
DROP VIEW IF EXISTS public.stock_count_items CASCADE;

CREATE VIEW public.stock_count_items AS
SELECT
  sci.id,
  sci.stock_count_id,
  sci.stock_item_id,
  sci.batch_id,
  NULL::uuid AS storage_area_id,
  si.library_item_id AS ingredient_id,
  CASE
    WHEN si.library_type = 'ingredients_library' THEN 'ingredients'::text
    WHEN si.library_type = 'packaging_library' THEN 'packaging'::text
    WHEN si.library_type = 'disposables_library' THEN 'foh'::text
    WHEN si.library_type = 'first_aid_supplies_library' THEN 'first_aid'::text
    WHEN si.library_type = 'ppe_library' THEN 'ppe'::text
    WHEN si.library_type = 'chemicals_library' THEN 'chemicals'::text
    ELSE NULL::text
  END AS library_type,
  NULL::uuid AS counted_storage_area_id,
  NULL::text AS item_type,
  NULL::numeric(10,2) AS opening_stock,
  0::numeric(10,2) AS stock_in,
  0::numeric(10,2) AS sales,
  0::numeric(10,2) AS waste,
  0::numeric(10,2) AS transfers_in,
  0::numeric(10,2) AS transfers_out,
  sci.expected_quantity,
  sci.expected_quantity AS theoretical_closing,
  sci.expected_value,
  sci.counted_quantity,
  sci.counted_value,
  sci.variance_quantity,
  CASE
    WHEN sci.expected_quantity > 0 AND sci.variance_quantity IS NOT NULL THEN
      (sci.variance_quantity / sci.expected_quantity * 100)::numeric(8,2)
    ELSE 0::numeric(8,2)
  END AS variance_percentage,
  sci.variance_percent,
  sci.variance_value,
  NULL::text AS unit_of_measurement,
  sci.unit_cost,
  sci.is_counted,
  CASE
    WHEN sci.is_counted = true THEN 'counted'::text
    WHEN sci.counted_quantity IS NOT NULL THEN 'counted'::text
    ELSE 'pending'::text
  END AS status,
  sci.needs_recount,
  sci.counted_at,
  sci.notes,
  sci.created_at,
  sci.updated_at
FROM stockly.stock_count_items sci
LEFT JOIN stockly.stock_items si ON si.id = sci.stock_item_id;

-- ============================================================================
-- 3. Recreate INSERT trigger to pass batch_id through
-- ============================================================================
DROP FUNCTION IF EXISTS public.insert_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.insert_stock_count_items()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_item_id UUID;
  v_company_id UUID;
  v_variance_percent numeric(8,2);
  v_has_variance_percent BOOLEAN;
BEGIN
  -- Get company_id from stock_count
  SELECT company_id INTO v_company_id
  FROM stockly.stock_counts
  WHERE id = NEW.stock_count_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Could not find company_id for stock_count_id %', NEW.stock_count_id;
  END IF;

  -- If NEW has ingredient_id, get or create stock_item
  IF NEW.ingredient_id IS NOT NULL THEN
    v_stock_item_id := public.get_or_create_stock_item(
      NEW.ingredient_id,
      COALESCE(NEW.library_type, 'ingredients'),
      v_company_id
    );
  ELSE
    v_stock_item_id := NEW.stock_item_id;
    IF v_stock_item_id IS NULL THEN
      RAISE EXCEPTION 'Either ingredient_id or stock_item_id must be provided';
    END IF;
  END IF;

  -- Calculate variance_percent if we have variance data
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stockly'
    AND table_name = 'stock_count_items'
    AND column_name = 'variance_percent'
  ) INTO v_has_variance_percent;

  IF v_has_variance_percent AND (NEW.variance_percentage IS NOT NULL OR NEW.variance_quantity IS NOT NULL) THEN
    v_variance_percent := CASE
      WHEN NEW.variance_percentage IS NOT NULL THEN NEW.variance_percentage
      WHEN COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0) > 0 AND NEW.variance_quantity IS NOT NULL THEN
        (NEW.variance_quantity / COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 1) * 100)::numeric(8,2)
      ELSE NULL
    END;
  END IF;

  -- Insert into base table (now includes batch_id)
  INSERT INTO stockly.stock_count_items (
    id,
    stock_count_id,
    stock_item_id,
    batch_id,
    expected_quantity,
    unit_cost,
    notes,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.stock_count_id,
    v_stock_item_id,
    NEW.batch_id,
    COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0),
    NEW.unit_cost,
    NEW.notes,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  RETURNING id INTO NEW.id;

  -- Update is_counted and needs_recount if needed
  IF NEW.is_counted IS NOT NULL OR NEW.status = 'counted' OR NEW.needs_recount IS NOT NULL THEN
    UPDATE stockly.stock_count_items SET
      is_counted = CASE
        WHEN NEW.is_counted IS NOT NULL THEN NEW.is_counted
        WHEN NEW.status = 'counted' THEN true
        ELSE is_counted
      END,
      needs_recount = CASE WHEN NEW.needs_recount IS NOT NULL THEN NEW.needs_recount ELSE needs_recount END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  -- Update counted columns if explicitly provided
  IF NEW.counted_quantity IS NOT NULL OR v_variance_percent IS NOT NULL THEN
    UPDATE stockly.stock_count_items SET
      counted_quantity = CASE WHEN NEW.counted_quantity IS NOT NULL THEN NEW.counted_quantity ELSE counted_quantity END,
      variance_percent = CASE WHEN v_variance_percent IS NOT NULL THEN v_variance_percent ELSE variance_percent END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Recreate UPDATE trigger (batch_id is immutable once set)
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.update_stock_count_items()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_item_id UUID;
  v_company_id UUID;
BEGIN
  -- Get company_id from stock_count
  SELECT company_id INTO v_company_id
  FROM stockly.stock_counts
  WHERE id = NEW.stock_count_id;

  -- If ingredient_id changed, resolve stock_item
  IF NEW.ingredient_id IS NOT NULL AND (OLD.ingredient_id IS NULL OR NEW.ingredient_id != OLD.ingredient_id) THEN
    v_stock_item_id := public.get_or_create_stock_item(
      NEW.ingredient_id,
      COALESCE(NEW.library_type, 'ingredients'),
      COALESCE(v_company_id, (SELECT company_id FROM stockly.stock_counts WHERE id = NEW.stock_count_id))
    );
  ELSE
    v_stock_item_id := NEW.stock_item_id;
  END IF;

  UPDATE stockly.stock_count_items SET
    stock_count_id = NEW.stock_count_id,
    stock_item_id = COALESCE(v_stock_item_id, stock_item_id),
    expected_quantity = COALESCE(NEW.theoretical_closing, NEW.expected_quantity, expected_quantity),
    counted_quantity = CASE
      WHEN NEW.counted_quantity IS NOT NULL THEN NEW.counted_quantity
      ELSE counted_quantity
    END,
    variance_percent = CASE
      WHEN NEW.variance_percentage IS NOT NULL THEN NEW.variance_percentage
      WHEN COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0) > 0
           AND NEW.counted_quantity IS NOT NULL THEN
        ((NEW.counted_quantity - COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 0)) / COALESCE(NEW.theoretical_closing, NEW.expected_quantity, 1) * 100)::numeric(8,2)
      ELSE variance_percent
    END,
    unit_cost = CASE WHEN NEW.unit_cost IS NOT NULL THEN NEW.unit_cost ELSE unit_cost END,
    is_counted = COALESCE(
      CASE WHEN NEW.is_counted IS NOT NULL THEN NEW.is_counted ELSE NULL END,
      CASE WHEN NEW.status = 'counted' THEN true ELSE NULL END,
      is_counted
    ),
    needs_recount = CASE WHEN NEW.needs_recount IS NOT NULL THEN NEW.needs_recount ELSE needs_recount END,
    counted_at = CASE WHEN NEW.counted_at IS NOT NULL THEN NEW.counted_at::timestamptz ELSE counted_at END,
    notes = CASE WHEN NEW.notes IS NOT NULL THEN NEW.notes ELSE notes END,
    updated_at = COALESCE(NEW.updated_at, NOW())
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_stock_count_items trigger for item %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Recreate DELETE trigger
-- ============================================================================
DROP FUNCTION IF EXISTS public.delete_stock_count_items() CASCADE;

CREATE OR REPLACE FUNCTION public.delete_stock_count_items()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM stockly.stock_count_items
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Create all triggers on the view
-- ============================================================================
DROP TRIGGER IF EXISTS stock_count_items_insert_trigger ON public.stock_count_items;
DROP TRIGGER IF EXISTS stock_count_items_update_trigger ON public.stock_count_items;
DROP TRIGGER IF EXISTS stock_count_items_delete_trigger ON public.stock_count_items;

CREATE TRIGGER stock_count_items_insert_trigger
  INSTEAD OF INSERT ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_stock_count_items();

CREATE TRIGGER stock_count_items_update_trigger
  INSTEAD OF UPDATE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_count_items();

CREATE TRIGGER stock_count_items_delete_trigger
  INSTEAD OF DELETE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.delete_stock_count_items();

-- ============================================================================
-- 7. Recreate items_counted auto-update trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_stock_count_items_counted()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_count_id UUID;
  v_should_update BOOLEAN := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_stock_count_id := OLD.stock_count_id;
    v_should_update := true;
  ELSIF TG_OP = 'INSERT' THEN
    v_stock_count_id := NEW.stock_count_id;
    v_should_update := COALESCE(NEW.is_counted, false) = true;
  ELSIF TG_OP = 'UPDATE' THEN
    v_stock_count_id := NEW.stock_count_id;
    v_should_update := (OLD.is_counted IS DISTINCT FROM NEW.is_counted);
  END IF;

  IF v_should_update AND v_stock_count_id IS NOT NULL THEN
    UPDATE stockly.stock_counts
    SET
      items_counted = (
        SELECT COUNT(*)
        FROM stockly.stock_count_items
        WHERE stock_count_id = v_stock_count_id
          AND is_counted = true
      ),
      updated_at = NOW()
    WHERE id = v_stock_count_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS stock_count_items_auto_update_counted ON stockly.stock_count_items;

CREATE TRIGGER stock_count_items_auto_update_counted
  AFTER INSERT OR UPDATE OR DELETE ON stockly.stock_count_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_count_items_counted();

-- ============================================================================
-- 8. Extend process_approved_stock_count RPC for batch handling
-- ============================================================================
CREATE OR REPLACE FUNCTION process_approved_stock_count(p_count_id uuid)
RETURNS void AS $$
DECLARE
  v_count RECORD;
  v_item RECORD;
  v_agg RECORD;
  v_site_id uuid;
  v_company_id uuid;
  v_existing_level_id uuid;
  v_variance numeric(12,3);
BEGIN
  -- Get count details
  SELECT * INTO v_count
  FROM stockly.stock_counts
  WHERE id = p_count_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock count not found: %', p_count_id;
  END IF;

  IF v_count.status != 'approved' THEN
    RAISE EXCEPTION 'Stock count must be approved before processing. Current status: %', v_count.status;
  END IF;

  v_site_id := v_count.site_id;
  v_company_id := v_count.company_id;

  -- ================================================================
  -- PART A: Process NON-BATCHED items (existing logic, unchanged)
  -- ================================================================
  FOR v_item IN
    SELECT * FROM stockly.stock_count_items
    WHERE stock_count_id = p_count_id
    AND is_counted = true
    AND counted_quantity IS NOT NULL
    AND batch_id IS NULL
  LOOP
    -- Find or create stock level
    SELECT id INTO v_existing_level_id
    FROM stockly.stock_levels
    WHERE stock_item_id = v_item.stock_item_id
    AND site_id = v_site_id;

    IF v_existing_level_id IS NOT NULL THEN
      UPDATE stockly.stock_levels
      SET
        quantity = v_item.counted_quantity,
        last_count_date = v_count.count_date,
        last_count_quantity = v_item.counted_quantity,
        updated_at = now()
      WHERE id = v_existing_level_id;
    ELSE
      INSERT INTO stockly.stock_levels (
        stock_item_id, site_id, quantity,
        last_count_date, last_count_quantity,
        created_at, updated_at
      ) VALUES (
        v_item.stock_item_id, v_site_id, v_item.counted_quantity,
        v_count.count_date, v_item.counted_quantity,
        now(), now()
      );
    END IF;

    -- Create stock movement for variance
    IF ABS(COALESCE(v_item.variance_quantity, 0)) > 0.001 THEN
      INSERT INTO stockly.stock_movements (
        company_id, stock_item_id, site_id,
        movement_type, quantity, unit_cost,
        reference_type, reference_id, notes, created_at
      ) VALUES (
        v_company_id, v_item.stock_item_id, v_site_id,
        'count_adjustment', v_item.variance_quantity, v_item.unit_cost,
        'stock_count', p_count_id,
        format('Stock count adjustment from count: %s', COALESCE(v_count.count_number, v_count.name, v_count.id::text)),
        now()
      );
    END IF;
  END LOOP;

  -- ================================================================
  -- PART B: Process BATCHED items — aggregate stock_levels per item
  -- ================================================================
  FOR v_agg IN
    SELECT
      stock_item_id,
      SUM(counted_quantity) AS total_counted,
      SUM(COALESCE(variance_quantity, 0)) AS total_variance,
      MAX(unit_cost) AS unit_cost
    FROM stockly.stock_count_items
    WHERE stock_count_id = p_count_id
    AND is_counted = true
    AND counted_quantity IS NOT NULL
    AND batch_id IS NOT NULL
    GROUP BY stock_item_id
  LOOP
    -- Update stock_levels with aggregate total
    SELECT id INTO v_existing_level_id
    FROM stockly.stock_levels
    WHERE stock_item_id = v_agg.stock_item_id
    AND site_id = v_site_id;

    IF v_existing_level_id IS NOT NULL THEN
      UPDATE stockly.stock_levels
      SET
        quantity = v_agg.total_counted,
        last_count_date = v_count.count_date,
        last_count_quantity = v_agg.total_counted,
        updated_at = now()
      WHERE id = v_existing_level_id;
    ELSE
      INSERT INTO stockly.stock_levels (
        stock_item_id, site_id, quantity,
        last_count_date, last_count_quantity,
        created_at, updated_at
      ) VALUES (
        v_agg.stock_item_id, v_site_id, v_agg.total_counted,
        v_count.count_date, v_agg.total_counted,
        now(), now()
      );
    END IF;

    -- Create aggregate stock movement for the item if there's variance
    IF ABS(v_agg.total_variance) > 0.001 THEN
      INSERT INTO stockly.stock_movements (
        company_id, stock_item_id, site_id,
        movement_type, quantity, unit_cost,
        reference_type, reference_id, notes, created_at
      ) VALUES (
        v_company_id, v_agg.stock_item_id, v_site_id,
        'count_adjustment', v_agg.total_variance, v_agg.unit_cost,
        'stock_count', p_count_id,
        format('Stock count adjustment (batched) from count: %s', COALESCE(v_count.count_number, v_count.name, v_count.id::text)),
        now()
      );
    END IF;
  END LOOP;

  -- ================================================================
  -- PART C: Update individual batch quantities and create movements
  -- ================================================================
  FOR v_item IN
    SELECT
      sci.*,
      sb.quantity_remaining AS current_batch_qty
    FROM stockly.stock_count_items sci
    JOIN stockly.stock_batches sb ON sb.id = sci.batch_id
    WHERE sci.stock_count_id = p_count_id
    AND sci.is_counted = true
    AND sci.counted_quantity IS NOT NULL
    AND sci.batch_id IS NOT NULL
  LOOP
    -- Calculate batch-level variance
    v_variance := v_item.counted_quantity - v_item.current_batch_qty;

    -- Update batch quantity_remaining to counted value
    UPDATE stockly.stock_batches
    SET
      quantity_remaining = v_item.counted_quantity,
      updated_at = now()
    WHERE id = v_item.batch_id;

    -- Mark as depleted if counted at zero or below
    IF v_item.counted_quantity <= 0 THEN
      UPDATE stockly.stock_batches
      SET
        status = 'depleted',
        quantity_remaining = 0,
        updated_at = now()
      WHERE id = v_item.batch_id;
    END IF;

    -- Create batch movement for the adjustment (if any variance)
    IF ABS(v_variance) > 0.001 THEN
      INSERT INTO stockly.batch_movements (
        company_id, site_id, batch_id,
        movement_type, quantity,
        reference_type, reference_id,
        notes, created_at, created_by
      ) VALUES (
        v_company_id, v_site_id, v_item.batch_id,
        'adjustment', v_variance,
        'stock_count', p_count_id,
        format('Stock count adjustment: counted %s (was %s)', v_item.counted_quantity, v_item.current_batch_qty),
        now(), NULL
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_items TO anon;
GRANT EXECUTE ON FUNCTION process_approved_stock_count(uuid) TO authenticated;

-- Stock count batch tracking migration complete
