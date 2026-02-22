-- ============================================================================
-- Migration: 02-stockly-stock-counts.sql
-- Description: Stock counting feature (stock_counts, stock_count_items tables)
-- Run this AFTER 01-stockly-foundation.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- STOCK COUNTS (Header)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  count_number text,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  count_type text NOT NULL DEFAULT 'full'
    CHECK (count_type IN ('full', 'partial', 'spot', 'rolling')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'pending_review', 'approved', 'completed', 'cancelled')),
  
  -- Scope (for partial counts)
  categories uuid[],
  storage_areas uuid[],
  
  -- Results (calculated)
  total_items int DEFAULT 0,
  items_counted int DEFAULT 0,
  counted_items int DEFAULT 0,
  variance_count int DEFAULT 0,
  variance_value numeric(12,2) DEFAULT 0,
  
  -- Tracking
  started_at timestamptz,
  started_by uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STOCK COUNT SECTIONS (By storage area)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_count_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES stockly.stock_counts(id) ON DELETE CASCADE,
  storage_area_id uuid NOT NULL REFERENCES stockly.storage_areas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to uuid REFERENCES public.profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  item_count int DEFAULT 0,
  counted_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STOCK COUNT ITEMS (Individual items - simplified for variance reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES stockly.stock_counts(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
  
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
  
  -- Unit cost for value calculation
  unit_cost numeric(10,4),
  
  -- Status
  is_counted boolean DEFAULT false,
  needs_recount boolean DEFAULT false,
  
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STOCK COUNT LINES (Detailed lines by section - for detailed counting)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stockly.stock_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_section_id uuid NOT NULL REFERENCES stockly.stock_count_sections(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stockly.stock_items(id) ON DELETE CASCADE,
  storage_area_id uuid NOT NULL REFERENCES stockly.storage_areas(id) ON DELETE CASCADE,
  
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
  
  count_method text DEFAULT 'manual' CHECK (count_method IN ('manual', 'photo', 'scale', 'barcode')),
  photo_url text,
  
  notes text,
  
  counted_by uuid REFERENCES public.profiles(id),
  counted_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON stockly.stock_counts(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON stockly.stock_counts(site_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stockly.stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON stockly.stock_counts(count_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_count_sections_count ON stockly.stock_count_sections(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_sections_storage_area ON stockly.stock_count_sections(storage_area_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_count ON stockly.stock_count_items(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_item ON stockly.stock_count_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_section ON stockly.stock_count_lines(stock_count_section_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_item ON stockly.stock_count_lines(stock_item_id);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE stockly.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_count_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.stock_count_lines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS stock_counts_company ON stockly.stock_counts;
CREATE POLICY stock_counts_company ON stockly.stock_counts FOR ALL 
    USING (stockly.stockly_company_access(company_id));

DROP POLICY IF EXISTS count_sections_parent ON stockly.stock_count_sections;
CREATE POLICY count_sections_parent ON stockly.stock_count_sections FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.stock_counts sc
        WHERE sc.id = stockly.stock_count_sections.stock_count_id
          AND stockly.stockly_company_access(sc.company_id)
    )
);

DROP POLICY IF EXISTS count_items_parent ON stockly.stock_count_items;
CREATE POLICY count_items_parent ON stockly.stock_count_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.stock_counts sc
        WHERE sc.id = stockly.stock_count_items.stock_count_id
          AND stockly.stockly_company_access(sc.company_id)
    )
);

DROP POLICY IF EXISTS count_lines_parent ON stockly.stock_count_lines;
CREATE POLICY count_lines_parent ON stockly.stock_count_lines FOR ALL USING (
    EXISTS (
        SELECT 1 FROM stockly.stock_count_sections scs
        JOIN stockly.stock_counts sc ON sc.id = scs.stock_count_id
        WHERE scs.id = stockly.stock_count_lines.stock_count_section_id
          AND stockly.stockly_company_access(sc.company_id)
    )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-generate count number
CREATE OR REPLACE FUNCTION stockly.generate_stock_count_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_year text;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM stockly.stock_counts
  WHERE company_id = p_company_id
  AND created_at >= date_trunc('year', CURRENT_DATE);
  
  RETURN 'SC-' || v_year || '-' || LPAD(v_count::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION stockly.set_stock_count_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.count_number IS NULL THEN
    NEW.count_number := stockly.generate_stock_count_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_count_number ON stockly.stock_counts;
CREATE TRIGGER trg_stock_count_number
  BEFORE INSERT ON stockly.stock_counts
  FOR EACH ROW
  EXECUTE FUNCTION stockly.set_stock_count_number();

COMMIT;

SELECT 'Stock count tables created successfully' as result;
