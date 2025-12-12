-- ============================================================================
-- Migration: Create Stockly POS Sales & GP Reporting Tables
-- Description: Creates tables and views for POS integration and GP reporting
-- ============================================================================

-- Create sales table for individual POS transactions
CREATE TABLE IF NOT EXISTS stockly.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  
  -- POS Integration
  pos_transaction_id TEXT,
  pos_provider TEXT, -- 'csv', 'manual', 'api_*'
  import_batch_id UUID REFERENCES stockly.sales_imports(id) ON DELETE SET NULL,
  
  -- Sale Details
  sale_date DATE NOT NULL,
  gross_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discounts NUMERIC(10, 2) DEFAULT 0,
  net_revenue NUMERIC(10, 2) NOT NULL,
  vat_amount NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  
  -- Metrics
  covers INTEGER DEFAULT 1,
  payment_method TEXT DEFAULT 'card', -- 'card', 'cash', 'mixed'
  
  -- Status
  status TEXT DEFAULT 'completed', -- 'completed', 'refunded', 'void'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sale_items table for line items (for category GP)
CREATE TABLE IF NOT EXISTS stockly.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES stockly.sales(id) ON DELETE CASCADE,
  
  -- Item Details
  item_name TEXT NOT NULL,
  category_name TEXT, -- Sales category (Food, Drinks, etc.)
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_sales_summary table for aggregated daily totals
CREATE TABLE IF NOT EXISTS stockly.daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  summary_date DATE NOT NULL,
  
  -- Revenue
  gross_revenue NUMERIC(10, 2) DEFAULT 0,
  net_revenue NUMERIC(10, 2) DEFAULT 0,
  
  -- Cost of Goods (from deliveries)
  total_cost NUMERIC(10, 2) DEFAULT 0,
  
  -- Profit
  gross_profit NUMERIC(10, 2) DEFAULT 0,
  gp_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- Metrics
  total_covers INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, site_id, summary_date)
);

-- Create sales_imports table to track CSV/API import batches
CREATE TABLE IF NOT EXISTS stockly.sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  
  -- Import Details
  import_type TEXT NOT NULL, -- 'csv', 'api_*'
  pos_provider TEXT,
  filename TEXT,
  
  -- Date Range
  date_from DATE,
  date_to DATE,
  
  -- Statistics
  records_total INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  revenue_total NUMERIC(10, 2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON stockly.sales(company_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_site_date ON stockly.sales(site_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON stockly.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_company_date ON stockly.daily_sales_summary(company_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_imports_company ON stockly.sales_imports(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE stockly.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.sales_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales
CREATE POLICY "Users can view their company's sales"
  ON stockly.sales FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's sales"
  ON stockly.sales FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for sale_items
CREATE POLICY "Users can view their company's sale items"
  ON stockly.sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stockly.sales s
      JOIN public.profiles p ON p.company_id = s.company_id
      WHERE s.id = sale_items.sale_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's sale items"
  ON stockly.sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stockly.sales s
      JOIN public.profiles p ON p.company_id = s.company_id
      WHERE s.id = sale_items.sale_id AND p.id = auth.uid()
    )
  );

-- RLS Policies for daily_sales_summary
CREATE POLICY "Users can view their company's daily summaries"
  ON stockly.daily_sales_summary FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's daily summaries"
  ON stockly.daily_sales_summary FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's daily summaries"
  ON stockly.daily_sales_summary FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for sales_imports
CREATE POLICY "Users can view their company's sales imports"
  ON stockly.sales_imports FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's sales imports"
  ON stockly.sales_imports FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's sales imports"
  ON stockly.sales_imports FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create function to recalculate daily summary
CREATE OR REPLACE FUNCTION stockly.recalculate_daily_summary(
  p_company_id UUID,
  p_site_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_revenue NUMERIC(10, 2);
  v_gross_revenue NUMERIC(10, 2);
  v_covers INTEGER;
  v_transactions INTEGER;
  v_cost NUMERIC(10, 2);
  v_profit NUMERIC(10, 2);
  v_gp_percentage NUMERIC(5, 2);
BEGIN
  -- Calculate revenue from sales
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(gross_revenue), 0),
    COALESCE(SUM(covers), 0),
    COUNT(*)
  INTO v_revenue, v_gross_revenue, v_covers, v_transactions
  FROM stockly.sales
  WHERE company_id = p_company_id
    AND sale_date = p_date
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND status = 'completed';

  -- Calculate COGS from deliveries (simplified - matches by date)
  SELECT COALESCE(SUM(d.total), 0)
  INTO v_cost
  FROM public.deliveries d
  WHERE d.company_id = p_company_id
    AND d.delivery_date = p_date
    AND (p_site_id IS NULL OR d.site_id = p_site_id)
    AND d.status = 'confirmed';

  -- Calculate profit
  v_profit := v_revenue - v_cost;
  v_gp_percentage := CASE 
    WHEN v_revenue > 0 THEN (v_profit / v_revenue) * 100 
    ELSE 0 
  END;

  -- Upsert daily summary
  INSERT INTO stockly.daily_sales_summary (
    company_id,
    site_id,
    summary_date,
    gross_revenue,
    net_revenue,
    total_cost,
    gross_profit,
    gp_percentage,
    total_covers,
    transaction_count
  ) VALUES (
    p_company_id,
    p_site_id,
    p_date,
    v_gross_revenue,
    v_revenue,
    v_cost,
    v_profit,
    v_gp_percentage,
    v_covers,
    v_transactions
  )
  ON CONFLICT (company_id, site_id, summary_date)
  DO UPDATE SET
    gross_revenue = EXCLUDED.gross_revenue,
    net_revenue = EXCLUDED.net_revenue,
    total_cost = EXCLUDED.total_cost,
    gross_profit = EXCLUDED.gross_profit,
    gp_percentage = EXCLUDED.gp_percentage,
    total_covers = EXCLUDED.total_covers,
    transaction_count = EXCLUDED.transaction_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create weekly GP view
CREATE OR REPLACE VIEW stockly.v_gp_weekly AS
SELECT 
  d.company_id,
  d.site_id,
  DATE_TRUNC('week', d.summary_date)::DATE AS week_start,
  DATE_TRUNC('month', d.summary_date)::DATE AS month_start,
  SUM(d.net_revenue) AS revenue,
  SUM(d.total_cost) AS cost_of_goods,
  SUM(d.gross_profit) AS gross_profit,
  CASE 
    WHEN SUM(d.net_revenue) > 0 
    THEN (SUM(d.gross_profit) / SUM(d.net_revenue)) * 100 
    ELSE 0 
  END AS gp_percentage,
  SUM(d.transaction_count) AS transaction_count,
  SUM(d.total_covers) AS total_covers,
  CASE 
    WHEN SUM(d.total_covers) > 0 
    THEN SUM(d.net_revenue) / SUM(d.total_covers) 
    ELSE 0 
  END AS revenue_per_cover
FROM stockly.daily_sales_summary d
GROUP BY d.company_id, d.site_id, DATE_TRUNC('week', d.summary_date)::DATE, DATE_TRUNC('month', d.summary_date)::DATE;

-- Create monthly GP view
CREATE OR REPLACE VIEW stockly.v_gp_monthly AS
SELECT 
  d.company_id,
  d.site_id,
  DATE_TRUNC('month', d.summary_date)::DATE AS month_start,
  TO_CHAR(DATE_TRUNC('month', d.summary_date), 'Month YYYY') AS month_name,
  SUM(d.net_revenue) AS revenue,
  SUM(d.total_cost) AS cost_of_goods,
  SUM(d.gross_profit) AS gross_profit,
  CASE 
    WHEN SUM(d.net_revenue) > 0 
    THEN (SUM(d.gross_profit) / SUM(d.net_revenue)) * 100 
    ELSE 0 
  END AS gp_percentage,
  SUM(d.transaction_count) AS transaction_count,
  SUM(d.total_covers) AS total_covers,
  CASE 
    WHEN SUM(d.total_covers) > 0 
    THEN SUM(d.net_revenue) / SUM(d.total_covers) 
    ELSE 0 
  END AS revenue_per_cover
FROM stockly.daily_sales_summary d
GROUP BY d.company_id, d.site_id, DATE_TRUNC('month', d.summary_date)::DATE;

-- Create GP by category view
CREATE OR REPLACE VIEW stockly.v_gp_by_category AS
SELECT 
  si.sale_id,
  s.company_id,
  s.site_id,
  DATE_TRUNC('month', s.sale_date)::DATE AS month_start,
  si.category_name,
  SUM(si.line_total) AS revenue,
  -- COGS would need to be calculated from delivery_lines matched by item
  -- This is a simplified version
  0 AS cost,
  SUM(si.line_total) AS gross_profit,
  100.0 AS gp_percentage,
  COUNT(*) AS items_sold
FROM stockly.sale_items si
JOIN stockly.sales s ON s.id = si.sale_id
WHERE s.status = 'completed'
GROUP BY si.sale_id, s.company_id, s.site_id, DATE_TRUNC('month', s.sale_date)::DATE, si.category_name;

-- Grant access to views
GRANT SELECT ON stockly.v_gp_weekly TO authenticated;
GRANT SELECT ON stockly.v_gp_monthly TO authenticated;
GRANT SELECT ON stockly.v_gp_by_category TO authenticated;
