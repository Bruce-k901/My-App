-- ============================================================================
-- Migration: Create Stockly Core Tables
-- Description: Storage areas, suppliers, categories, stock items, variants, levels, movements
-- Note: This migration will be skipped if companies or sites tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and sites tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- ============================================================================
    -- STORAGE AREAS (within sites)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.storage_areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL,
      name TEXT NOT NULL,
      area_type TEXT CHECK (area_type IN ('chilled', 'frozen', 'ambient', 'bar', 'cellar', 'external')),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(site_id, name)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'storage_areas_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'storage_areas'
    ) THEN
      ALTER TABLE public.storage_areas
      ADD CONSTRAINT storage_areas_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_storage_areas_site ON public.storage_areas(site_id);

    -- ============================================================================
    -- SUPPLIERS
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      name TEXT NOT NULL,
      code TEXT,
      
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address JSONB,
      
      ordering_method TEXT CHECK (ordering_method IN ('app', 'whatsapp', 'email', 'phone', 'portal', 'rep')),
      ordering_config JSONB DEFAULT '{}',
      -- ordering_config example for whatsapp: {whatsapp_number: "+447123456789", template: "..."}
      
      payment_terms_days INTEGER DEFAULT 30,
      minimum_order_value DECIMAL(10,2),
      delivery_days TEXT[],
      lead_time_days INTEGER DEFAULT 1,
      account_number TEXT,
      
      is_active BOOLEAN DEFAULT TRUE,
      is_approved BOOLEAN DEFAULT TRUE,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(company_id, code)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'suppliers_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'suppliers'
    ) THEN
      ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_active ON public.suppliers(company_id, is_active) WHERE is_active = TRUE;

    -- ============================================================================
    -- STOCK CATEGORIES
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.stock_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      parent_id UUID,
      
      name TEXT NOT NULL,
      category_type TEXT NOT NULL CHECK (category_type IN (
        'food', 'beverage', 'alcohol', 'chemical', 'disposable', 'equipment', 'other'
      )),
      sort_order INTEGER DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_categories_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_categories'
    ) THEN
      ALTER TABLE public.stock_categories
      ADD CONSTRAINT stock_categories_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_categories_parent_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'stock_categories'
    ) THEN
      ALTER TABLE public.stock_categories
      ADD CONSTRAINT stock_categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.stock_categories(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_stock_categories_company ON public.stock_categories(company_id);

    -- Unique constraint for company_id, name, and parent_id (handling NULL parent_id)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_categories_unique 
      ON public.stock_categories(company_id, name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

    -- ============================================================================
    -- STOCK ITEMS (CANONICAL)
    -- ============================================================================
    -- Only create if uom table exists (created in previous migration)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'uom') THEN
      CREATE TABLE IF NOT EXISTS public.stock_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        category_id UUID,
        
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT,
        
        base_unit_id UUID NOT NULL,
        
        yield_percent DECIMAL(5,2) DEFAULT 100.00 
          CHECK (yield_percent > 0 AND yield_percent <= 100),
        yield_notes TEXT,
        
        track_stock BOOLEAN DEFAULT TRUE,
        par_level DECIMAL(10,3),
        reorder_qty DECIMAL(10,3),
        
        allergens TEXT[],
        
        is_prep_item BOOLEAN DEFAULT FALSE,
        is_purchasable BOOLEAN DEFAULT TRUE,
        
        costing_method TEXT DEFAULT 'weighted_avg' 
          CHECK (costing_method IN ('weighted_avg', 'fifo', 'last_price')),
        current_cost DECIMAL(10,4),
        cost_updated_at TIMESTAMPTZ,
        
        is_active BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(company_id, name)
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_items_company_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_items'
      ) THEN
        ALTER TABLE public.stock_items
        ADD CONSTRAINT stock_items_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_items_category_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_items'
      ) THEN
        ALTER TABLE public.stock_items
        ADD CONSTRAINT stock_items_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.stock_categories(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_items_base_unit_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_items'
      ) THEN
        ALTER TABLE public.stock_items
        ADD CONSTRAINT stock_items_base_unit_id_fkey
        FOREIGN KEY (base_unit_id) REFERENCES public.uom(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_stock_items_company ON public.stock_items(company_id);
      CREATE INDEX IF NOT EXISTS idx_stock_items_category ON public.stock_items(category_id);
      CREATE INDEX IF NOT EXISTS idx_stock_items_active ON public.stock_items(company_id, is_active) WHERE is_active = TRUE;

      -- ============================================================================
      -- PRODUCT VARIANTS (purchasable products for canonical items)
      -- ============================================================================
      CREATE TABLE IF NOT EXISTS public.product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_item_id UUID NOT NULL,
        supplier_id UUID NOT NULL,
        
        supplier_code TEXT,
        product_name TEXT NOT NULL,
        brand TEXT,
        barcode TEXT,
        
        pack_size DECIMAL(10,3) NOT NULL,
        pack_unit_id UUID NOT NULL,
        units_per_case INTEGER DEFAULT 1,
        
        conversion_factor DECIMAL(12,6) NOT NULL,
        
        current_price DECIMAL(10,2),
        price_per_base DECIMAL(10,4),
        price_updated_at TIMESTAMPTZ,
        
        is_preferred BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT TRUE,
        is_discontinued BOOLEAN DEFAULT FALSE,
        
        min_order_qty DECIMAL(10,3) DEFAULT 1,
        order_multiple DECIMAL(10,3) DEFAULT 1,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_variants_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'product_variants'
      ) THEN
        ALTER TABLE public.product_variants
        ADD CONSTRAINT product_variants_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_variants_supplier_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'product_variants'
      ) THEN
        ALTER TABLE public.product_variants
        ADD CONSTRAINT product_variants_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'product_variants_pack_unit_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'product_variants'
      ) THEN
        ALTER TABLE public.product_variants
        ADD CONSTRAINT product_variants_pack_unit_id_fkey
        FOREIGN KEY (pack_unit_id) REFERENCES public.uom(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_product_variants_stock_item ON public.product_variants(stock_item_id);
      CREATE INDEX IF NOT EXISTS idx_product_variants_supplier ON public.product_variants(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_product_variants_preferred ON public.product_variants(stock_item_id, is_preferred) 
        WHERE is_preferred = TRUE;

      -- Unique constraint for stock_item_id, supplier_id, and supplier_code (handling NULL supplier_code)
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique 
        ON public.product_variants(stock_item_id, supplier_id, COALESCE(supplier_code, ''));
    END IF;

    -- ============================================================================
    -- PRICE HISTORY
    -- ============================================================================
    -- Only create if product_variants table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_variants') THEN
      CREATE TABLE IF NOT EXISTS public.price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_variant_id UUID NOT NULL,
        
        old_price DECIMAL(10,2),
        new_price DECIMAL(10,2) NOT NULL,
        old_price_per_base DECIMAL(10,4),
        new_price_per_base DECIMAL(10,4) NOT NULL,
        change_percent DECIMAL(5,2),
        
        source TEXT CHECK (source IN ('invoice', 'manual', 'price_list', 'import')),
        source_ref TEXT,
        
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        recorded_by UUID
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'price_history_product_variant_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'price_history'
      ) THEN
        ALTER TABLE public.price_history
        ADD CONSTRAINT price_history_product_variant_id_fkey
        FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'price_history_recorded_by_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'price_history'
        ) THEN
          ALTER TABLE public.price_history
          ADD CONSTRAINT price_history_recorded_by_fkey
          FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_price_history_variant ON public.price_history(product_variant_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_date ON public.price_history(recorded_at DESC);
    END IF;

    -- ============================================================================
    -- STOCK LEVELS
    -- ============================================================================
    -- Only create if stock_items table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      CREATE TABLE IF NOT EXISTS public.stock_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_item_id UUID NOT NULL,
        site_id UUID NOT NULL,
        storage_area_id UUID,
        
        quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
        
        avg_cost DECIMAL(10,4),
        total_value DECIMAL(12,2),
        
        last_movement_at TIMESTAMPTZ,
        last_count_at TIMESTAMPTZ,
        
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_levels_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_levels'
      ) THEN
        ALTER TABLE public.stock_levels
        ADD CONSTRAINT stock_levels_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_levels_site_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_levels'
      ) THEN
        ALTER TABLE public.stock_levels
        ADD CONSTRAINT stock_levels_site_id_fkey
        FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_levels_storage_area_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_levels'
        ) THEN
          ALTER TABLE public.stock_levels
          ADD CONSTRAINT stock_levels_storage_area_id_fkey
          FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas(id) ON DELETE SET NULL;
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_stock_levels_site ON public.stock_levels(site_id);
      CREATE INDEX IF NOT EXISTS idx_stock_levels_item ON public.stock_levels(stock_item_id);

      -- Unique constraint for stock_item_id, site_id, and storage_area_id (handling NULL storage_area_id)
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_levels_unique 
        ON public.stock_levels(stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid));
    END IF;

    -- ============================================================================
    -- STOCK MOVEMENTS (audit trail)
    -- ============================================================================
    -- Only create if stock_items table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') THEN
      CREATE TABLE IF NOT EXISTS public.stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        stock_item_id UUID NOT NULL,
        
        movement_type TEXT NOT NULL CHECK (movement_type IN (
          'purchase', 'transfer_out', 'transfer_in', 'internal_sale',
          'waste', 'staff_sale', 'pos_drawdown', 'production_out',
          'production_in', 'adjustment', 'count_adjustment', 'return_supplier'
        )),
        
        quantity DECIMAL(12,4) NOT NULL,
        
        from_site_id UUID,
        from_storage_id UUID,
        to_site_id UUID,
        to_storage_id UUID,
        
        unit_cost DECIMAL(10,4),
        total_cost DECIMAL(12,2),
        
        ref_type TEXT,
        ref_id UUID,
        
        reason TEXT,
        notes TEXT,
        photo_urls TEXT[],
        
        recorded_by UUID,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add foreign keys conditionally
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_movements_company_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_movements'
      ) THEN
        ALTER TABLE public.stock_movements
        ADD CONSTRAINT stock_movements_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES public.companies(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_movements_stock_item_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'stock_movements'
      ) THEN
        ALTER TABLE public.stock_movements
        ADD CONSTRAINT stock_movements_stock_item_id_fkey
        FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_movements_from_site_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_movements'
        ) THEN
          ALTER TABLE public.stock_movements
          ADD CONSTRAINT stock_movements_from_site_id_fkey
          FOREIGN KEY (from_site_id) REFERENCES public.sites(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_movements_to_site_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_movements'
        ) THEN
          ALTER TABLE public.stock_movements
          ADD CONSTRAINT stock_movements_to_site_id_fkey
          FOREIGN KEY (to_site_id) REFERENCES public.sites(id);
        END IF;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_areas') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_movements_from_storage_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_movements'
        ) THEN
          ALTER TABLE public.stock_movements
          ADD CONSTRAINT stock_movements_from_storage_id_fkey
          FOREIGN KEY (from_storage_id) REFERENCES public.storage_areas(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_movements_to_storage_id_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_movements'
        ) THEN
          ALTER TABLE public.stock_movements
          ADD CONSTRAINT stock_movements_to_storage_id_fkey
          FOREIGN KEY (to_storage_id) REFERENCES public.storage_areas(id);
        END IF;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'stock_movements_recorded_by_fkey' 
          AND table_schema = 'public' 
          AND table_name = 'stock_movements'
        ) THEN
          ALTER TABLE public.stock_movements
          ADD CONSTRAINT stock_movements_recorded_by_fkey
          FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);
        END IF;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements(company_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(stock_item_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
    END IF;

  ELSE
    RAISE NOTICE '⚠️ companies or sites tables do not exist yet - skipping stockly core tables creation';
  END IF;
END $$;

