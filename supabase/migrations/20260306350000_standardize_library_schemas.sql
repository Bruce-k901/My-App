-- ============================================================================
-- Migration: Standardize Library Table Schemas
-- Adds department, costing, and stock tracking columns to ALL library tables
-- so items can be moved between libraries and all support department filtering.
-- Uses ADD COLUMN IF NOT EXISTS throughout for safety.
-- ============================================================================

-- chemicals_library
ALTER TABLE chemicals_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- ppe_library
ALTER TABLE ppe_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- disposables_library
ALTER TABLE disposables_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- packaging_library
ALTER TABLE packaging_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS par_level NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- first_aid_supplies_library
ALTER TABLE first_aid_supplies_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- drinks_library
ALTER TABLE drinks_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS par_level NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- glassware_library
ALTER TABLE glassware_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS par_level NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- serving_equipment_library
ALTER TABLE serving_equipment_library
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS pack_cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS par_level NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC,
  ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_stock_count_date TIMESTAMPTZ;

-- Department indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_chemicals_department ON chemicals_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppe_department ON ppe_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disposables_department ON disposables_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_packaging_department ON packaging_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_first_aid_department ON first_aid_supplies_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drinks_department ON drinks_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_glassware_department ON glassware_library(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_serving_equipment_department ON serving_equipment_library(department) WHERE department IS NOT NULL;

NOTIFY pgrst, 'reload schema';
