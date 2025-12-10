-- ============================================================================
-- Migration: Create Stock Counts Tables
-- Description: Stock counts, sections, and lines for Stockly inventory management
-- ============================================================================

BEGIN;

-- ============================================================================
-- STOCK COUNTS (Header)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  count_number text,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  count_type text NOT NULL DEFAULT 'full'
    CHECK (count_type IN ('full', 'partial', 'spot', 'rolling')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'pending_review', 'completed', 'cancelled')),
  
  -- Scope (for partial counts)
  categories uuid[],
  storage_areas uuid[],
  
  -- Results (calculated)
  total_items int DEFAULT 0,
  counted_items int DEFAULT 0,
  variance_count int DEFAULT 0,
  variance_value numeric(12,2) DEFAULT 0,
  
  -- Tracking
  started_at timestamptz,
  started_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STOCK COUNT SECTIONS (By storage area)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_count_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  storage_area_id uuid NOT NULL REFERENCES storage_areas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to uuid REFERENCES profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  item_count int DEFAULT 0,
  counted_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STOCK COUNT LINES (Individual items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_section_id uuid NOT NULL REFERENCES stock_count_sections(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  storage_area_id uuid NOT NULL REFERENCES storage_areas(id) ON DELETE CASCADE,
  
  -- Expected (snapshot from system at count creation)
  expected_quantity numeric(12,3) NOT NULL DEFAULT 0,
  expected_value numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Counted
  counted_quantity numeric(12,3),
  counted_value numeric(12,2),
  
  -- Variance (calculated)
  variance_quantity numeric(12,3) DEFAULT 0,
  variance_value numeric(12,2) DEFAULT 0,
  variance_percent numeric(8,2) DEFAULT 0,
  
  -- Status
  is_counted boolean DEFAULT false,
  needs_recount boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON stock_counts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON stock_counts(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stock_counts(count_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_count_sections_count ON stock_count_sections(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_sections_storage_area ON stock_count_sections(storage_area_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_section ON stock_count_lines(stock_count_section_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_item ON stock_count_lines(stock_item_id);

-- RLS is handled in 20250217000009_create_stockly_rls_policies.sql
-- Note: The existing RLS policy for stock_count_lines needs to be fixed
-- as it references stock_count_id instead of stock_count_section_id

-- Auto-generate count number
CREATE OR REPLACE FUNCTION generate_stock_count_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM stock_counts
  WHERE company_id = p_company_id
  AND created_at >= date_trunc('year', CURRENT_DATE);
  
  RETURN 'SC-' || v_year || '-' || LPAD(v_count::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION set_stock_count_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.count_number IS NULL THEN
    NEW.count_number := generate_stock_count_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_count_number ON stock_counts;
CREATE TRIGGER trg_stock_count_number
  BEFORE INSERT ON stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION set_stock_count_number();

COMMIT;

SELECT 'Stock count tables created successfully' as result;

