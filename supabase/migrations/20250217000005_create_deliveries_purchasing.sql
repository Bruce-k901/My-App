-- ============================================================================
-- Migration: Create Deliveries and Purchasing Tables
-- Description: Purchase orders, deliveries, and delivery lines for Stockly
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies, sites, and suppliers tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN

    -- ============================================================================
    -- DELIVERIES
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      supplier_id UUID NOT NULL,
      purchase_order_id UUID,
      
      delivery_date DATE NOT NULL,
      delivery_note_number TEXT,
      invoice_number TEXT,
      invoice_date DATE,
      
      subtotal DECIMAL(12,2),
      tax DECIMAL(10,2),
      total DECIMAL(12,2),
      
      ai_processed BOOLEAN DEFAULT FALSE,
      ai_confidence DECIMAL(3,2),
      ai_extraction JSONB,
      requires_review BOOLEAN DEFAULT FALSE,
      
      document_urls TEXT[],
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'confirmed', 'disputed', 'cancelled'
      )),
      
      received_by UUID,
      confirmed_by UUID,
      confirmed_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'deliveries_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'deliveries'
    ) THEN
      ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'deliveries_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'deliveries'
    ) THEN
      ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'deliveries_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'deliveries'
    ) THEN
      ALTER TABLE public.deliveries
      ADD CONSTRAINT deliveries_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'deliveries_received_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'deliveries'
      ) THEN
        ALTER TABLE public.deliveries
        ADD CONSTRAINT deliveries_received_by_fkey
        FOREIGN KEY (received_by) REFERENCES public.profiles(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'deliveries_confirmed_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'deliveries'
      ) THEN
        ALTER TABLE public.deliveries
        ADD CONSTRAINT deliveries_confirmed_by_fkey
        FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_deliveries_company ON public.deliveries(company_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_site ON public.deliveries(site_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_supplier ON public.deliveries(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(delivery_date DESC);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);

    -- ============================================================================
    -- DELIVERY LINES
    -- ============================================================================
    -- Only create if deliveries and product_variants exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
      CREATE TABLE IF NOT EXISTS public.delivery_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_id UUID NOT NULL,
        product_variant_id UUID NOT NULL,
        storage_area_id UUID,
        
        quantity DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        line_total DECIMAL(10,2),
        
        qty_base_units DECIMAL(12,4) NOT NULL,
        
        was_substituted BOOLEAN DEFAULT FALSE,
        original_variant_id UUID,
        
        price_changed BOOLEAN DEFAULT FALSE,
        expected_price DECIMAL(10,2),
        
        ai_match_confidence DECIMAL(3,2),
        
        notes TEXT
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'delivery_lines_delivery_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'delivery_lines'
      ) THEN
        ALTER TABLE public.delivery_lines
        ADD CONSTRAINT delivery_lines_delivery_id_fkey
        FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'delivery_lines_product_variant_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'delivery_lines'
      ) THEN
        ALTER TABLE public.delivery_lines
        ADD CONSTRAINT delivery_lines_product_variant_id_fkey
        FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'delivery_lines_storage_area_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'delivery_lines'
        ) THEN
          ALTER TABLE public.delivery_lines
          ADD CONSTRAINT delivery_lines_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'delivery_lines_original_variant_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'delivery_lines'
        ) THEN
          ALTER TABLE public.delivery_lines
          ADD CONSTRAINT delivery_lines_original_variant_id_fkey
          FOREIGN KEY (original_variant_id) REFERENCES public.product_variants(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON public.delivery_lines(delivery_id);
    END IF;

    -- ============================================================================
    -- PURCHASE ORDERS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      supplier_id UUID NOT NULL,
      
      order_number TEXT NOT NULL,
      order_date DATE NOT NULL,
      expected_delivery DATE,
      
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled'
      )),
      
      subtotal DECIMAL(12,2),
      tax DECIMAL(10,2),
      total DECIMAL(12,2),
      
      sent_via TEXT CHECK (sent_via IN ('whatsapp', 'email', 'app', 'phone', 'portal')),
      sent_message TEXT,
      sent_at TIMESTAMPTZ,
      
      notes TEXT,
      
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchase_orders_created_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'purchase_orders'
      ) THEN
        ALTER TABLE public.purchase_orders
        ADD CONSTRAINT purchase_orders_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

    -- ============================================================================
    -- PURCHASE ORDER LINES
    -- ============================================================================
    -- Only create if purchase_orders and product_variants exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
      CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL,
        product_variant_id UUID NOT NULL,
        
        quantity_ordered DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2),
        line_total DECIMAL(10,2),
        
        quantity_received DECIMAL(10,3) DEFAULT 0,
        received_variant_id UUID,
        
        notes TEXT
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchase_order_lines_purchase_order_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'purchase_order_lines'
      ) THEN
        ALTER TABLE public.purchase_order_lines
        ADD CONSTRAINT purchase_order_lines_purchase_order_id_fkey
        FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchase_order_lines_product_variant_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'purchase_order_lines'
      ) THEN
        ALTER TABLE public.purchase_order_lines
        ADD CONSTRAINT purchase_order_lines_product_variant_id_fkey
        FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'purchase_order_lines_received_variant_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'purchase_order_lines'
      ) THEN
        ALTER TABLE public.purchase_order_lines
        ADD CONSTRAINT purchase_order_lines_received_variant_id_fkey
        FOREIGN KEY (received_variant_id) REFERENCES public.product_variants(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_po_lines_po ON public.purchase_order_lines(purchase_order_id);
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies, sites, or suppliers tables do not exist yet - skipping deliveries and purchasing tables creation';
  END IF;
END $$;

