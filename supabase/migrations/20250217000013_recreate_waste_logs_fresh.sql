-- ============================================================================
-- Migration: Recreate waste_logs table with Stockly schema
-- Description: Drop old table and create fresh Stockly waste_logs table
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- Drop old waste_logs table and all dependencies
    DROP TABLE IF EXISTS public.waste_logs CASCADE;

    -- Create new Stockly waste_logs table (from migration 20250217000006)
    CREATE TABLE IF NOT EXISTS public.waste_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      
      waste_date DATE NOT NULL,
      waste_reason TEXT NOT NULL CHECK (waste_reason IN (
        'expired', 'damaged', 'spillage', 'overproduction', 
        'quality', 'customer_return', 'temperature_breach', 
        'pest_damage', 'theft', 'prep_waste', 'other'
      )),
      
      notes TEXT,
      photo_urls TEXT[],
      total_cost DECIMAL(10,2),
      
      -- Link to Checkly if from temperature breach
      checkly_task_id UUID,
      
      recorded_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'waste_logs_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'waste_logs'
    ) THEN
      ALTER TABLE public.waste_logs
      ADD CONSTRAINT waste_logs_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'waste_logs_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'waste_logs'
    ) THEN
      ALTER TABLE public.waste_logs
      ADD CONSTRAINT waste_logs_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waste_logs_recorded_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'waste_logs'
      ) THEN
        ALTER TABLE public.waste_logs
        ADD CONSTRAINT waste_logs_recorded_by_fkey
        FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON public.waste_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_site ON public.waste_logs(site_id);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON public.waste_logs(waste_date DESC);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON public.waste_logs(waste_reason);

    -- Create waste_log_lines table (from migration 20250217000006)
    -- Only create if waste_logs and stock_items exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      CREATE TABLE IF NOT EXISTS public.waste_log_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        waste_log_id UUID NOT NULL,
        stock_item_id UUID NOT NULL,
        
        quantity DECIMAL(10,3) NOT NULL,
        unit_cost DECIMAL(10,4),
        line_cost DECIMAL(10,2),
        
        specific_reason TEXT,
        notes TEXT
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waste_log_lines_waste_log_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'waste_log_lines'
      ) THEN
        ALTER TABLE public.waste_log_lines
        ADD CONSTRAINT waste_log_lines_waste_log_id_fkey
        FOREIGN KEY (waste_log_id) REFERENCES public.waste_logs(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'waste_log_lines_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'waste_log_lines'
      ) THEN
        ALTER TABLE public.waste_log_lines
        ADD CONSTRAINT waste_log_lines_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_waste_lines_log ON public.waste_log_lines(waste_log_id);
    END IF;

    -- Enable RLS
    ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_log_lines') THEN
      ALTER TABLE public.waste_log_lines ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create RLS policies (recreate since we dropped the table)
    -- Only create policies if stockly_company_access function exists
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = 'stockly_company_access'
    ) THEN
      -- Company-scoped policy for waste_logs
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_logs') THEN
        DROP POLICY IF EXISTS waste_logs_company ON public.waste_logs;
        CREATE POLICY waste_logs_company ON public.waste_logs FOR ALL 
          USING (stockly_company_access(company_id));
      END IF;
      
      -- Child table policy for waste_log_lines
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'waste_log_lines') THEN
        DROP POLICY IF EXISTS waste_lines_parent ON public.waste_log_lines;
        CREATE POLICY waste_lines_parent ON public.waste_log_lines FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.waste_logs wl
            WHERE wl.id = waste_log_lines.waste_log_id
              AND stockly_company_access(wl.company_id)
          )
        );
      END IF;
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping waste_logs recreation';
  END IF;
END $$;

