-- Fix: Allow saving prep items with NULL unit_cost without crashing price history trigger
-- The new_unit_cost column is NOT NULL, so we need to skip the insert when unit_cost is NULL

BEGIN;

-- Update the trigger function to skip price history when new_unit_cost would be NULL
CREATE OR REPLACE FUNCTION log_ingredient_price_change()
RETURNS TRIGGER AS $$
DECLARE
  v_change_percent NUMERIC;
  v_old_pack_size NUMERIC;
  v_new_pack_size NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Check if price changed
    IF NEW.unit_cost IS DISTINCT FROM OLD.unit_cost OR
       NEW.pack_cost IS DISTINCT FROM OLD.pack_cost OR
       NEW.pack_size IS DISTINCT FROM OLD.pack_size THEN

      -- Skip if new_unit_cost would be NULL (prep items before recipe cost calculation)
      -- The new_unit_cost column is NOT NULL, so we can't insert NULL
      IF NEW.unit_cost IS NULL THEN
        RETURN NEW;
      END IF;

      -- Calculate change percentage
      IF OLD.unit_cost IS NOT NULL AND OLD.unit_cost > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_change_percent := ((NEW.unit_cost - OLD.unit_cost) / OLD.unit_cost) * 100;
      END IF;

      -- Safely cast pack_size to NUMERIC (handles both TEXT and NUMERIC source types)
      BEGIN
        IF OLD.pack_size IS NULL OR OLD.pack_size::TEXT = '' THEN
          v_old_pack_size := NULL;
        ELSE
          v_old_pack_size := NULLIF(OLD.pack_size::TEXT, '')::NUMERIC;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_old_pack_size := NULL;
      END;

      BEGIN
        IF NEW.pack_size IS NULL OR NEW.pack_size::TEXT = '' THEN
          v_new_pack_size := NULL;
        ELSE
          v_new_pack_size := NULLIF(NEW.pack_size::TEXT, '')::NUMERIC;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_new_pack_size := NULL;
      END;

      -- Log the price change
      INSERT INTO stockly.ingredient_price_history (
        company_id,
        ingredient_id,
        old_unit_cost,
        new_unit_cost,
        old_pack_cost,
        new_pack_cost,
        old_pack_size,
        new_pack_size,
        change_percent,
        source,
        recorded_by
      ) VALUES (
        NEW.company_id,
        NEW.id,
        OLD.unit_cost,
        NEW.unit_cost,
        OLD.pack_cost,
        NEW.pack_cost,
        v_old_pack_size,
        v_new_pack_size,
        v_change_percent,
        'manual',
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
