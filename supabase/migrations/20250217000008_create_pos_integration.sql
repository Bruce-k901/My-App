-- ============================================================================
-- Migration: Create POS Integration Tables
-- Description: POS sales tracking and AI processing queue
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- POS SALES
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.pos_sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      
      pos_provider TEXT NOT NULL,
      pos_transaction_id TEXT NOT NULL,
      
      sale_date DATE NOT NULL,
      sale_time TIME,
      
      subtotal DECIMAL(10,2),
      tax DECIMAL(10,2),
      total DECIMAL(10,2),
      
      is_staff_sale BOOLEAN DEFAULT FALSE,
      staff_discount_percent DECIMAL(5,2),
      
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      drawdown_processed BOOLEAN DEFAULT FALSE,
      drawdown_processed_at TIMESTAMPTZ,
      
      raw_data JSONB,
      
      UNIQUE(site_id, pos_provider, pos_transaction_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'pos_sales_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'pos_sales'
    ) THEN
      ALTER TABLE public.pos_sales
      ADD CONSTRAINT pos_sales_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'pos_sales_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'pos_sales'
    ) THEN
      ALTER TABLE public.pos_sales
      ADD CONSTRAINT pos_sales_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_pos_sales_site ON public.pos_sales(site_id);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON public.pos_sales(sale_date DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_sales_pending ON public.pos_sales(drawdown_processed) WHERE drawdown_processed = FALSE;

    -- ============================================================================
    -- POS SALE LINES
    -- ============================================================================
    -- Only create if pos_sales exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
      CREATE TABLE IF NOT EXISTS public.pos_sale_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pos_sale_id UUID NOT NULL,
        
        pos_product_id TEXT,
        pos_product_name TEXT,
        
        recipe_id UUID,
        
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2),
        line_total DECIMAL(10,2),
        
        cost_of_goods DECIMAL(10,2),
        gross_profit DECIMAL(10,2),
        gp_percent DECIMAL(5,2)
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pos_sale_lines_pos_sale_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'pos_sale_lines'
      ) THEN
        ALTER TABLE public.pos_sale_lines
        ADD CONSTRAINT pos_sale_lines_pos_sale_id_fkey
        FOREIGN KEY (pos_sale_id) REFERENCES public.pos_sales(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipes') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'pos_sale_lines_recipe_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'pos_sale_lines'
        ) THEN
          ALTER TABLE public.pos_sale_lines
          ADD CONSTRAINT pos_sale_lines_recipe_id_fkey
          FOREIGN KEY (recipe_id) REFERENCES public.recipes(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_sale ON public.pos_sale_lines(pos_sale_id);
      CREATE INDEX IF NOT EXISTS idx_pos_sale_lines_recipe ON public.pos_sale_lines(recipe_id);
    END IF;

    -- ============================================================================
    -- AI PROCESSING QUEUE
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.ai_processing_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      process_type TEXT NOT NULL CHECK (process_type IN (
        'invoice_extract', 'label_scan', 'count_photo', 'waste_photo'
      )),
      
      image_urls TEXT[] NOT NULL,
      context JSONB,
      
      status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'needs_review'
      )),
      
      result JSONB,
      confidence DECIMAL(3,2),
      error_message TEXT,
      
      result_type TEXT,
      result_id UUID,
      
      processed_at TIMESTAMPTZ,
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ai_processing_queue_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'ai_processing_queue'
    ) THEN
      ALTER TABLE public.ai_processing_queue
      ADD CONSTRAINT ai_processing_queue_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_processing_queue_reviewed_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'ai_processing_queue'
      ) THEN
        ALTER TABLE public.ai_processing_queue
        ADD CONSTRAINT ai_processing_queue_reviewed_by_fkey
        FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_ai_queue_company ON public.ai_processing_queue(company_id);
    CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON public.ai_processing_queue(status) WHERE status = 'pending';

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping POS integration tables creation';
  END IF;
END $$;

