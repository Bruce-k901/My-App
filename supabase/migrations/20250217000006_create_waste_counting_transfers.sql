-- ============================================================================
-- Migration: Create Waste, Counting, and Transfers Tables
-- Description: Waste logging, stock counts, and inter-site transfers
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- WASTE LOGGING
    -- ============================================================================
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

    CREATE INDEX IF NOT EXISTS idx_waste_logs_company ON public.waste_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_site ON public.waste_logs(site_id);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON public.waste_logs(waste_date DESC);
    CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON public.waste_logs(waste_reason);

    -- ============================================================================
    -- WASTE LOG LINES
    -- ============================================================================
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

    -- ============================================================================
    -- STOCK COUNTS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_counts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      
      count_date DATE NOT NULL,
      count_type TEXT DEFAULT 'full' CHECK (count_type IN ('full', 'partial', 'spot', 'rolling')),
      
      status TEXT DEFAULT 'in_progress' CHECK (status IN (
        'planned', 'in_progress', 'pending_review', 'finalised', 'cancelled'
      )),
      
      is_blind BOOLEAN DEFAULT FALSE,
      
      expected_value DECIMAL(12,2),
      actual_value DECIMAL(12,2),
      variance_value DECIMAL(12,2),
      variance_percent DECIMAL(5,2),
      
      notes TEXT,
      
      started_by UUID,
      started_at TIMESTAMPTZ,
      finalised_by UUID,
      finalised_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_counts_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_counts'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD CONSTRAINT stock_counts_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_counts_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_counts'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD CONSTRAINT stock_counts_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_counts_started_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_counts'
      ) THEN
        ALTER TABLE public.stock_counts
        ADD CONSTRAINT stock_counts_started_by_fkey
        FOREIGN KEY (started_by) REFERENCES public.profiles(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_counts_finalised_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_counts'
      ) THEN
        ALTER TABLE public.stock_counts
        ADD CONSTRAINT stock_counts_finalised_by_fkey
        FOREIGN KEY (finalised_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON public.stock_counts(company_id);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON public.stock_counts(site_id);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON public.stock_counts(count_date DESC);

    -- ============================================================================
    -- STOCK COUNT SECTIONS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_count_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stock_count_id UUID NOT NULL,
      storage_area_id UUID,
      
      name TEXT NOT NULL,
      section_type TEXT,
      sort_order INTEGER DEFAULT 0,
      
      expected_value DECIMAL(12,2),
      actual_value DECIMAL(12,2),
      variance_value DECIMAL(12,2),
      
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'reviewed')),
      
      counted_by UUID,
      counted_at TIMESTAMPTZ
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_count_sections_stock_count_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_count_sections'
    ) THEN
      ALTER TABLE public.stock_count_sections
      ADD CONSTRAINT stock_count_sections_stock_count_id_fkey
      FOREIGN KEY (stock_count_id) REFERENCES public.stock_counts(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_sections_storage_area_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_sections'
      ) THEN
        ALTER TABLE public.stock_count_sections
        ADD CONSTRAINT stock_count_sections_storage_area_id_fkey
        FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id);
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_sections_counted_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_sections'
      ) THEN
        ALTER TABLE public.stock_count_sections
        ADD CONSTRAINT stock_count_sections_counted_by_fkey
        FOREIGN KEY (counted_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_count_sections_count ON public.stock_count_sections(stock_count_id);

    -- ============================================================================
    -- STOCK COUNT LINES
    -- ============================================================================
    -- Only create if stock_counts and stock_items exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      CREATE TABLE IF NOT EXISTS public.stock_count_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_count_id UUID NOT NULL,
        section_id UUID,
        stock_item_id UUID NOT NULL,
        
        expected_qty DECIMAL(12,4),
        expected_value DECIMAL(10,2),
        
        counted_qty DECIMAL(12,4),
        counted_value DECIMAL(10,2),
        
        variance_qty DECIMAL(12,4),
        variance_value DECIMAL(10,2),
        
        count_method TEXT DEFAULT 'manual' CHECK (count_method IN ('manual', 'photo', 'scale', 'barcode')),
        photo_url TEXT,
        
        notes TEXT,
        
        counted_by UUID,
        counted_at TIMESTAMPTZ
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_lines_stock_count_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_lines'
      ) THEN
        ALTER TABLE public.stock_count_lines
        ADD CONSTRAINT stock_count_lines_stock_count_id_fkey
        FOREIGN KEY (stock_count_id) REFERENCES public.stock_counts(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_lines_section_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_count_lines'
        ) THEN
          ALTER TABLE public.stock_count_lines
          ADD CONSTRAINT stock_count_lines_section_id_fkey
          FOREIGN KEY (section_id) REFERENCES public.stock_count_sections(id) ON DELETE CASCADE;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_lines_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_lines'
      ) THEN
        ALTER TABLE public.stock_count_lines
        ADD CONSTRAINT stock_count_lines_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_lines_counted_by_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_count_lines'
        ) THEN
          ALTER TABLE public.stock_count_lines
          ADD CONSTRAINT stock_count_lines_counted_by_fkey
          FOREIGN KEY (counted_by) REFERENCES public.profiles(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_count_lines_count ON public.stock_count_lines(stock_count_id);
      CREATE INDEX IF NOT EXISTS idx_count_lines_section ON public.stock_count_lines(section_id);
    END IF;

    -- ============================================================================
    -- TRANSFERS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      from_site_id UUID NOT NULL,
      to_site_id UUID NOT NULL,
      
      transfer_date DATE NOT NULL,
      transfer_number TEXT,
      
      transfer_type TEXT DEFAULT 'transfer' CHECK (transfer_type IN ('transfer', 'internal_sale')),
      
      markup_percent DECIMAL(5,2) DEFAULT 0,
      subtotal DECIMAL(12,2),
      total DECIMAL(12,2),
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'in_transit', 'received', 'disputed', 'cancelled'
      )),
      
      notes TEXT,
      
      created_by UUID,
      sent_at TIMESTAMPTZ,
      received_by UUID,
      received_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'transfers_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'transfers'
    ) THEN
      ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'transfers_from_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'transfers'
    ) THEN
      ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_from_site_id_fkey
      FOREIGN KEY (from_site_id) REFERENCES public.sites(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'transfers_to_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'transfers'
    ) THEN
      ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_to_site_id_fkey
      FOREIGN KEY (to_site_id) REFERENCES public.sites(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transfers_created_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'transfers'
      ) THEN
        ALTER TABLE public.transfers
        ADD CONSTRAINT transfers_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transfers_received_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'transfers'
      ) THEN
        ALTER TABLE public.transfers
        ADD CONSTRAINT transfers_received_by_fkey
        FOREIGN KEY (received_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_transfers_company ON public.transfers(company_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_from ON public.transfers(from_site_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_to ON public.transfers(to_site_id);

    -- ============================================================================
    -- TRANSFER LINES
    -- ============================================================================
    -- Only create if transfers and stock_items exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      CREATE TABLE IF NOT EXISTS public.transfer_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_id UUID NOT NULL,
        stock_item_id UUID NOT NULL,
        
        quantity DECIMAL(12,4) NOT NULL,
        unit_cost DECIMAL(10,4),
        line_cost DECIMAL(10,2),
        
        markup_amount DECIMAL(10,2),
        line_total DECIMAL(10,2),
        
        qty_received DECIMAL(12,4),
        variance_notes TEXT,
        
        notes TEXT
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transfer_lines_transfer_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'transfer_lines'
      ) THEN
        ALTER TABLE public.transfer_lines
        ADD CONSTRAINT transfer_lines_transfer_id_fkey
        FOREIGN KEY (transfer_id) REFERENCES public.transfers(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transfer_lines_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'transfer_lines'
      ) THEN
        ALTER TABLE public.transfer_lines
        ADD CONSTRAINT transfer_lines_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON public.transfer_lines(transfer_id);
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping waste, counting, and transfers tables creation';
  END IF;
END $$;

