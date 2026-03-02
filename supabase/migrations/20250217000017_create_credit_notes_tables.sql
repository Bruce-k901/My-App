-- ============================================================================
-- Migration: Create Credit Notes Tables
-- Description: Credit note requests and lines for Stockly
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and suppliers tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN

    -- ============================================================================
    -- CREDIT NOTE REQUESTS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.credit_note_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID,
      supplier_id UUID NOT NULL,
      delivery_id UUID,
      
      request_number TEXT NOT NULL,
      request_date DATE NOT NULL,
      
      subtotal DECIMAL(12,2) NOT NULL,
      vat DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'acknowledged', 'approved', 'disputed', 'received', 'closed'
      )),
      
      -- Submission tracking
      submitted_at TIMESTAMPTZ,
      submitted_by UUID,
      submitted_via TEXT CHECK (submitted_via IN ('email', 'phone', 'portal', 'whatsapp', 'other')),
      
      -- Supplier response
      supplier_cn_number TEXT,
      supplier_cn_date DATE,
      approved_amount DECIMAL(12,2),
      supplier_response_notes TEXT,
      
      -- Documents
      document_urls TEXT[],
      
      -- Metadata
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'credit_note_requests_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'credit_note_requests'
    ) THEN
      ALTER TABLE public.credit_note_requests
      ADD CONSTRAINT credit_note_requests_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_note_requests_site_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'credit_note_requests'
      ) THEN
        ALTER TABLE public.credit_note_requests
        ADD CONSTRAINT credit_note_requests_site_id_fkey
        FOREIGN KEY (site_id) REFERENCES public.sites(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'credit_note_requests_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'credit_note_requests'
    ) THEN
      ALTER TABLE public.credit_note_requests
      ADD CONSTRAINT credit_note_requests_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_note_requests_delivery_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'credit_note_requests'
      ) THEN
        ALTER TABLE public.credit_note_requests
        ADD CONSTRAINT credit_note_requests_delivery_id_fkey
        FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id);
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_note_requests_submitted_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'credit_note_requests'
      ) THEN
        ALTER TABLE public.credit_note_requests
        ADD CONSTRAINT credit_note_requests_submitted_by_fkey
        FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_note_requests_created_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'credit_note_requests'
      ) THEN
        ALTER TABLE public.credit_note_requests
        ADD CONSTRAINT credit_note_requests_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_cn_requests_company ON public.credit_note_requests(company_id);
    CREATE INDEX IF NOT EXISTS idx_cn_requests_supplier ON public.credit_note_requests(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_cn_requests_delivery ON public.credit_note_requests(delivery_id);
    CREATE INDEX IF NOT EXISTS idx_cn_requests_status ON public.credit_note_requests(status);
    CREATE INDEX IF NOT EXISTS idx_cn_requests_date ON public.credit_note_requests(request_date DESC);
    CREATE INDEX IF NOT EXISTS idx_cn_requests_number ON public.credit_note_requests(request_number);

    -- ============================================================================
    -- CREDIT NOTE LINES
    -- ============================================================================
    -- Only create if credit_note_requests exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_requests') THEN
      CREATE TABLE IF NOT EXISTS public.credit_note_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        credit_note_request_id UUID NOT NULL,
        delivery_line_id UUID,
        
        stock_item_id UUID,
        product_variant_id UUID,
        
        description TEXT NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        line_total DECIMAL(12,2) NOT NULL,
        
        vat_rate NUMERIC(5,2) DEFAULT 0,
        vat_amount DECIMAL(12,2) DEFAULT 0,
        line_total_inc_vat DECIMAL(12,2),
        
        reason TEXT NOT NULL CHECK (reason IN (
          'damaged', 'short_delivery', 'wrong_item', 'quality_issue',
          'temperature_breach', 'expired', 'wrong_spec', 'not_ordered',
          'overcharge', 'other'
        )),
        notes TEXT,
        photo_url TEXT,
        
        -- Approval tracking
        approved BOOLEAN DEFAULT FALSE,
        approved_quantity DECIMAL(10,3),
        approved_amount DECIMAL(12,2),
        
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_note_lines_credit_note_request_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'credit_note_lines'
      ) THEN
        ALTER TABLE public.credit_note_lines
        ADD CONSTRAINT credit_note_lines_credit_note_request_id_fkey
        FOREIGN KEY (credit_note_request_id) REFERENCES public.credit_note_requests(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'credit_note_lines_delivery_line_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'credit_note_lines'
        ) THEN
          ALTER TABLE public.credit_note_lines
          ADD CONSTRAINT credit_note_lines_delivery_line_id_fkey
          FOREIGN KEY (delivery_line_id) REFERENCES public.delivery_lines(id);
        END IF;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'credit_note_lines_stock_item_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'credit_note_lines'
        ) THEN
          ALTER TABLE public.credit_note_lines
          ADD CONSTRAINT credit_note_lines_stock_item_id_fkey
          FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
        END IF;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'credit_note_lines_product_variant_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'credit_note_lines'
        ) THEN
          ALTER TABLE public.credit_note_lines
          ADD CONSTRAINT credit_note_lines_product_variant_id_fkey
          FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_cn_lines_request ON public.credit_note_lines(credit_note_request_id);
      CREATE INDEX IF NOT EXISTS idx_cn_lines_delivery_line ON public.credit_note_lines(delivery_line_id);
      CREATE INDEX IF NOT EXISTS idx_cn_lines_stock_item ON public.credit_note_lines(stock_item_id);
    END IF;

    -- ============================================================================
    -- UPDATE DELIVERY_LINES FOR REJECTION TRACKING
    -- ============================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_lines') THEN
      ALTER TABLE public.delivery_lines
      ADD COLUMN IF NOT EXISTS quantity_ordered DECIMAL(10,3),
      ADD COLUMN IF NOT EXISTS quantity_received DECIMAL(10,3),
      ADD COLUMN IF NOT EXISTS quantity_rejected DECIMAL(10,3),
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
      ADD COLUMN IF NOT EXISTS rejection_photo_url TEXT;

      -- Add check constraint for rejection_reason if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'delivery_lines' 
        AND constraint_name = 'delivery_lines_rejection_reason_check'
      ) THEN
        ALTER TABLE public.delivery_lines
        ADD CONSTRAINT delivery_lines_rejection_reason_check
        CHECK (rejection_reason IN (
          'damaged', 'short_delivery', 'wrong_item', 'quality_issue',
          'temperature_breach', 'expired', 'wrong_spec', 'not_ordered',
          'overcharge', 'other'
        ));
      END IF;

      COMMENT ON COLUMN public.delivery_lines.quantity_ordered IS 'Original quantity ordered/invoiced';
      COMMENT ON COLUMN public.delivery_lines.quantity_received IS 'Quantity actually received and accepted';
      COMMENT ON COLUMN public.delivery_lines.quantity_rejected IS 'Quantity rejected and subject to credit note';
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or suppliers tables do not exist yet - skipping credit notes tables creation';
  END IF;
END $$;

