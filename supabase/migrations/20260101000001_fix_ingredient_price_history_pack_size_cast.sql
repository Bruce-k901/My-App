-- Fix pack_size type casting in ingredient price history trigger
-- This fixes the error: "column old_pack_size is of type numeric but expression is of type text"
-- by safely casting pack_size from TEXT to NUMERIC

BEGIN;

-- Update the trigger function to safely cast pack_size
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
      
      -- Calculate change percentage
      IF OLD.unit_cost IS NOT NULL AND OLD.unit_cost > 0 AND NEW.unit_cost IS NOT NULL THEN
        v_change_percent := ((NEW.unit_cost - OLD.unit_cost) / OLD.unit_cost) * 100;
      END IF;
      
      -- Safely cast pack_size to NUMERIC (handles both TEXT and NUMERIC source types)
      -- If pack_size is NULL or empty, set to NULL
      -- If it's TEXT, convert to NUMERIC; if it's already NUMERIC, it will pass through
      BEGIN
        IF OLD.pack_size IS NULL OR OLD.pack_size::TEXT = '' THEN
          v_old_pack_size := NULL;
        ELSE
          v_old_pack_size := NULLIF(OLD.pack_size::TEXT, '')::NUMERIC;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If cast fails (invalid numeric), set to NULL
        v_old_pack_size := NULL;
      END;
      
      BEGIN
        IF NEW.pack_size IS NULL OR NEW.pack_size::TEXT = '' THEN
          v_new_pack_size := NULL;
        ELSE
          v_new_pack_size := NULLIF(NEW.pack_size::TEXT, '')::NUMERIC;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If cast fails (invalid numeric), set to NULL
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
        'manual', -- Can be enhanced to detect source
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
