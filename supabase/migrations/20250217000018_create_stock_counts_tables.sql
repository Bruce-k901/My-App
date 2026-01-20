-- ============================================================================
-- Migration: Create Stock Counts Tables
-- Description: Stock counts, sections, and lines for Stockly inventory management
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- STOCK COUNTS (Header)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_counts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL,
      site_id uuid NOT NULL,
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
      started_by uuid,
      completed_at timestamptz,
      completed_by uuid,
      reviewed_by uuid,
      reviewed_at timestamptz,
      
      notes text,
      
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
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
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_counts_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_counts'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD CONSTRAINT stock_counts_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
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
        WHERE constraint_name = 'stock_counts_completed_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_counts'
      ) THEN
        ALTER TABLE public.stock_counts
        ADD CONSTRAINT stock_counts_completed_by_fkey
        FOREIGN KEY (completed_by) REFERENCES public.profiles(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_counts_reviewed_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_counts'
      ) THEN
        ALTER TABLE public.stock_counts
        ADD CONSTRAINT stock_counts_reviewed_by_fkey
        FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    -- ============================================================================
    -- STOCK COUNT SECTIONS (By storage area)
    -- ============================================================================
    -- Only create if stock_counts and storage_areas exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
      CREATE TABLE IF NOT EXISTS public.stock_count_sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_count_id uuid NOT NULL,
        storage_area_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_progress', 'completed')),
        assigned_to uuid,
        started_at timestamptz,
        completed_at timestamptz,
        item_count int DEFAULT 0,
        counted_count int DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
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

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_sections_storage_area_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_sections'
      ) THEN
        ALTER TABLE public.stock_count_sections
        ADD CONSTRAINT stock_count_sections_storage_area_id_fkey
        FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_count_sections_assigned_to_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_count_sections'
        ) THEN
          ALTER TABLE public.stock_count_sections
          ADD CONSTRAINT stock_count_sections_assigned_to_fkey
          FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);
        END IF;
      END IF;
    END IF;

    -- ============================================================================
    -- STOCK COUNT LINES (Individual items)
    -- ============================================================================
    -- Only create if stock_count_sections, stock_items, and storage_areas exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
      CREATE TABLE IF NOT EXISTS public.stock_count_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_count_section_id uuid NOT NULL,
        stock_item_id uuid NOT NULL,
        storage_area_id uuid NOT NULL,
        
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

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_lines_stock_count_section_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_lines'
      ) THEN
        ALTER TABLE public.stock_count_lines
        ADD CONSTRAINT stock_count_lines_stock_count_section_id_fkey
        FOREIGN KEY (stock_count_section_id) REFERENCES public.stock_count_sections(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_lines_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_lines'
      ) THEN
        ALTER TABLE public.stock_count_lines
        ADD CONSTRAINT stock_count_lines_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_count_lines_storage_area_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_count_lines'
      ) THEN
        ALTER TABLE public.stock_count_lines
        ADD CONSTRAINT stock_count_lines_storage_area_id_fkey
        FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id) ON DELETE CASCADE;
      END IF;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_stock_counts_company ON public.stock_counts(company_id);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_site ON public.stock_counts(site_id);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON public.stock_counts(status);
    CREATE INDEX IF NOT EXISTS idx_stock_counts_date ON public.stock_counts(count_date DESC);
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_sections') THEN
      CREATE INDEX IF NOT EXISTS idx_stock_count_sections_count ON public.stock_count_sections(stock_count_id);
      CREATE INDEX IF NOT EXISTS idx_stock_count_sections_storage_area ON public.stock_count_sections(storage_area_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_count_lines') THEN
      CREATE INDEX IF NOT EXISTS idx_stock_count_lines_section ON public.stock_count_lines(stock_count_section_id);
      CREATE INDEX IF NOT EXISTS idx_stock_count_lines_item ON public.stock_count_lines(stock_item_id);
    END IF;

    -- RLS is handled in 20250217000009_create_stockly_rls_policies.sql
    -- Note: The existing RLS policy for stock_count_lines needs to be fixed
    -- as it references stock_count_id instead of stock_count_section_id

    -- Auto-generate count number function
    CREATE OR REPLACE FUNCTION generate_stock_count_number(p_company_id uuid)
    RETURNS text
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_count int;
      v_year text;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
        v_year := to_char(CURRENT_DATE, 'YY');
        
        SELECT COUNT(*) + 1 INTO v_count
        FROM public.stock_counts
        WHERE company_id = p_company_id
        AND created_at >= date_trunc('year', CURRENT_DATE);
        
        RETURN 'SC-' || v_year || '-' || LPAD(v_count::text, 4, '0');
      ELSE
        RETURN 'SC-' || to_char(CURRENT_DATE, 'YY') || '-0001';
      END IF;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION set_stock_count_number()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      IF NEW.count_number IS NULL THEN
        NEW.count_number := generate_stock_count_number(NEW.company_id);
      END IF;
      RETURN NEW;
    END;
    $function$;

    -- Create trigger conditionally
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
      DROP TRIGGER IF EXISTS trg_stock_count_number ON public.stock_counts;
      CREATE TRIGGER trg_stock_count_number
        BEFORE INSERT ON public.stock_counts
        FOR EACH ROW
        EXECUTE FUNCTION set_stock_count_number();
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping stock counts tables creation';
  END IF;
END $$;

