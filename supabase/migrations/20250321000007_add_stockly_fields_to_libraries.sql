-- ============================================================================
-- Migration: 20250321000007_add_stockly_fields_to_libraries.sql
-- Description: Adds Stockly stock management fields to all Checkly library tables
-- ============================================================================

-- ============================================================================
-- Helper Function: Update low_stock_alert automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.track_stock = true AND NEW.reorder_point IS NOT NULL THEN
    NEW.low_stock_alert := (NEW.current_stock <= NEW.reorder_point);
  ELSE
    NEW.low_stock_alert := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INGREDIENTS_LIBRARY: Add Stockly fields
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredients_library') THEN
    -- Add Stockly fields
    ALTER TABLE ingredients_library 
      ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS par_level NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS base_unit_id UUID,
      ADD COLUMN IF NOT EXISTS pack_size NUMERIC,
      ADD COLUMN IF NOT EXISTS pack_cost NUMERIC,
      ADD COLUMN IF NOT EXISTS yield_percent NUMERIC DEFAULT 100,
      ADD COLUMN IF NOT EXISTS yield_notes TEXT,
      ADD COLUMN IF NOT EXISTS costing_method TEXT DEFAULT 'average',
      ADD COLUMN IF NOT EXISTS is_prep_item BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS is_saleable BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
      ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT false;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_ingredients_track_stock 
      ON ingredients_library(company_id, track_stock) 
      WHERE track_stock = true;

    CREATE INDEX IF NOT EXISTS idx_ingredients_low_stock 
      ON ingredients_library(company_id, low_stock_alert) 
      WHERE low_stock_alert = true;

    -- Add foreign key for base_unit_id if uom table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uom') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ingredients_library_base_unit_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'ingredients_library'
      ) THEN
        ALTER TABLE ingredients_library
          ADD CONSTRAINT ingredients_library_base_unit_id_fkey
          FOREIGN KEY (base_unit_id) REFERENCES public.uom(id);
      END IF;
    END IF;

    -- Create trigger for low_stock_alert
    DROP TRIGGER IF EXISTS trg_ingredients_low_stock ON ingredients_library;
    CREATE TRIGGER trg_ingredients_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON ingredients_library
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();
  END IF;
END $$;

-- ============================================================================
-- PPE_LIBRARY: Add Stockly fields
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ppe_library') THEN
    ALTER TABLE ppe_library 
      ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS par_level NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_ppe_track_stock 
      ON ppe_library(company_id, track_stock) 
      WHERE track_stock = true;

    CREATE INDEX IF NOT EXISTS idx_ppe_low_stock 
      ON ppe_library(company_id, low_stock_alert) 
      WHERE low_stock_alert = true;

    DROP TRIGGER IF EXISTS trg_ppe_low_stock ON ppe_library;
    CREATE TRIGGER trg_ppe_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON ppe_library
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();
  END IF;
END $$;

-- ============================================================================
-- CHEMICALS_LIBRARY: Add Stockly fields
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chemicals_library') THEN
    ALTER TABLE chemicals_library 
      ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS par_level NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_chemicals_track_stock 
      ON chemicals_library(company_id, track_stock) 
      WHERE track_stock = true;

    CREATE INDEX IF NOT EXISTS idx_chemicals_low_stock 
      ON chemicals_library(company_id, low_stock_alert) 
      WHERE low_stock_alert = true;

    DROP TRIGGER IF EXISTS trg_chemicals_low_stock ON chemicals_library;
    CREATE TRIGGER trg_chemicals_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON chemicals_library
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();
  END IF;
END $$;

-- ============================================================================
-- DISPOSABLES_LIBRARY: Add Stockly fields
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disposables_library') THEN
    ALTER TABLE disposables_library 
      ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS par_level NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_disposables_track_stock 
      ON disposables_library(company_id, track_stock) 
      WHERE track_stock = true;

    CREATE INDEX IF NOT EXISTS idx_disposables_low_stock 
      ON disposables_library(company_id, low_stock_alert) 
      WHERE low_stock_alert = true;

    DROP TRIGGER IF EXISTS trg_disposables_low_stock ON disposables_library;
    CREATE TRIGGER trg_disposables_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON disposables_library
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();
  END IF;
END $$;

-- ============================================================================
-- FIRST_AID_SUPPLIES_LIBRARY: Add Stockly fields
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'first_aid_supplies_library') THEN
    ALTER TABLE first_aid_supplies_library 
      ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS par_level NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
      ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_first_aid_track_stock 
      ON first_aid_supplies_library(company_id, track_stock) 
      WHERE track_stock = true;

    CREATE INDEX IF NOT EXISTS idx_first_aid_low_stock 
      ON first_aid_supplies_library(company_id, low_stock_alert) 
      WHERE low_stock_alert = true;

    DROP TRIGGER IF EXISTS trg_first_aid_low_stock ON first_aid_supplies_library;
    CREATE TRIGGER trg_first_aid_low_stock
      BEFORE INSERT OR UPDATE OF current_stock, reorder_point, track_stock
      ON first_aid_supplies_library
      FOR EACH ROW
      EXECUTE FUNCTION update_low_stock_alert();
  END IF;
END $$;
