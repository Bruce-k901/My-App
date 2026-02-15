-- =============================================
-- SALES HISTORY & DEMAND FORECASTING
-- Historical data to predict staffing needs
-- =============================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- Daily sales records (imported from POS or manual entry)
    CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  
  sale_date DATE NOT NULL,
  
  -- Revenue
  gross_revenue INTEGER NOT NULL DEFAULT 0, -- In pence
  net_revenue INTEGER, -- After VAT
  
  -- Volume metrics
  covers INTEGER, -- Number of customers
  transactions INTEGER,
  average_spend INTEGER, -- Pence per customer
  
  -- Breakdown (optional)
  food_revenue INTEGER,
  beverage_revenue INTEGER,
  other_revenue INTEGER,
  
  -- Labour that day
  labour_hours DECIMAL(6,1),
  labour_cost INTEGER, -- In pence
  
  -- Calculated
  labour_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN gross_revenue > 0 
         THEN (labour_cost::DECIMAL / gross_revenue * 100)
         ELSE NULL END
  ) STORED,
  revenue_per_labour_hour INTEGER GENERATED ALWAYS AS (
    CASE WHEN labour_hours > 0 
         THEN ROUND(gross_revenue / labour_hours)
         ELSE NULL END
  ) STORED,
  
  -- Context
  weather TEXT, -- 'sunny', 'rainy', 'cold', etc.
  is_bank_holiday BOOLEAN DEFAULT false,
  is_local_event BOOLEAN DEFAULT false, -- e.g., football match nearby
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(site_id, sale_date)
);

    -- Hourly breakdown (if available from POS)
    CREATE TABLE IF NOT EXISTS hourly_sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_sales_id UUID NOT NULL REFERENCES daily_sales(id) ON DELETE CASCADE,
      
      hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
      revenue INTEGER DEFAULT 0,
      covers INTEGER DEFAULT 0,
      transactions INTEGER DEFAULT 0,
      
      UNIQUE(daily_sales_id, hour)
    );

    -- Staffing recommendations based on historical data
    CREATE OR REPLACE FUNCTION get_staffing_forecast(
      p_site_id UUID,
      p_date DATE
    )
    RETURNS TABLE (
      recommended_hours DECIMAL,
      recommended_staff INTEGER,
      predicted_revenue INTEGER,
      predicted_covers INTEGER,
      target_labour_percentage DECIMAL,
      confidence_level TEXT,
      basis_data JSONB
    ) AS $func$
    DECLARE
      v_dow INTEGER;
      v_avg_revenue INTEGER;
      v_avg_covers INTEGER;
      v_avg_hours DECIMAL;
      v_sample_size INTEGER;
      v_target_percentage DECIMAL := 28.0; -- Default target
    BEGIN
      v_dow := EXTRACT(DOW FROM p_date);
      
      -- Get average for same day of week over last 8 weeks
      SELECT 
        AVG(gross_revenue)::INTEGER,
        AVG(covers)::INTEGER,
        AVG(labour_hours),
        COUNT(*)::INTEGER
      INTO v_avg_revenue, v_avg_covers, v_avg_hours, v_sample_size
      FROM daily_sales
      WHERE site_id = p_site_id
        AND EXTRACT(DOW FROM sale_date) = v_dow
        AND sale_date >= p_date - INTERVAL '8 weeks'
        AND sale_date < p_date;
      
      -- Determine confidence based on sample size
      RETURN QUERY SELECT
        COALESCE(v_avg_hours, 40.0)::DECIMAL,
        CEIL(COALESCE(v_avg_hours, 40.0) / 8)::INTEGER, -- Rough staff count
        COALESCE(v_avg_revenue, 0),
        COALESCE(v_avg_covers, 0),
        v_target_percentage,
        CASE 
          WHEN v_sample_size >= 6 THEN 'high'
          WHEN v_sample_size >= 3 THEN 'medium'
          ELSE 'low'
        END,
        jsonb_build_object(
          'sample_size', v_sample_size,
          'day_of_week', v_dow,
          'weeks_analyzed', 8
        );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Get hourly demand pattern
    CREATE OR REPLACE FUNCTION get_hourly_demand_pattern(
      p_site_id UUID,
      p_day_of_week INTEGER
    )
    RETURNS TABLE (
      hour INTEGER,
      avg_revenue INTEGER,
      avg_covers INTEGER,
      pct_of_daily_revenue DECIMAL,
      suggested_staff INTEGER
    ) AS $func$
    BEGIN
      RETURN QUERY
      WITH daily_totals AS (
        SELECT ds.id, ds.gross_revenue as total_rev
        FROM daily_sales ds
        WHERE ds.site_id = p_site_id
          AND EXTRACT(DOW FROM ds.sale_date) = p_day_of_week
          AND ds.sale_date >= CURRENT_DATE - INTERVAL '8 weeks'
      ),
      hourly_avgs AS (
        SELECT 
          hs.hour,
          AVG(hs.revenue)::INTEGER as avg_rev,
          AVG(hs.covers)::INTEGER as avg_cov,
          AVG(CASE WHEN dt.total_rev > 0 
                   THEN hs.revenue::DECIMAL / dt.total_rev * 100 
                   ELSE 0 END) as pct_daily
        FROM hourly_sales hs
        JOIN daily_totals dt ON dt.id = hs.daily_sales_id
        GROUP BY hs.hour
      )
      SELECT 
        ha.hour,
        ha.avg_rev,
        ha.avg_cov,
        ROUND(ha.pct_daily, 1),
        GREATEST(1, CEIL(ha.avg_cov::DECIMAL / 20))::INTEGER -- 1 staff per 20 covers
      FROM hourly_avgs ha
      ORDER BY ha.hour;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_daily_sales_site_date ON daily_sales(site_id, sale_date);
    CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_hourly_sales_daily ON hourly_sales(daily_sales_id);

    -- Enable RLS
    ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
    ALTER TABLE hourly_sales ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own company sales" ON daily_sales;
    DROP POLICY IF EXISTS "Managers can manage sales" ON daily_sales;
    DROP POLICY IF EXISTS "Users can view hourly sales" ON hourly_sales;

    CREATE POLICY "Users can view own company sales" ON daily_sales
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage sales" ON daily_sales
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    CREATE POLICY "Users can view hourly sales" ON hourly_sales
      FOR SELECT USING (
        daily_sales_id IN (
          SELECT id FROM daily_sales 
          WHERE company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid()
          )
        )
      );

    RAISE NOTICE 'Created sales forecasting tables and functions with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites) do not exist yet - skipping sales forecasting';
  END IF;
END $$;

