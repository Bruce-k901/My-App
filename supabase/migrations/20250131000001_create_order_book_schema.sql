-- ============================================================================
-- Migration: Create Stockly Order Book Schema
-- Description: Production-first planning system for wholesale/pre-order businesses
-- Tables: suppliers (production kitchens), customers, products, orders, standing_orders,
--         production_profiles, production_schedule, equipment, storage_requirements, etc.
-- Note: This migration creates tables for the Order Book module (separate from Stockly purchasing)
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if companies and profiles tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- ============================================================================
    -- SUPPLIERS (Production Kitchens)
    -- ============================================================================
    -- Note: Different from stockly suppliers - these are production kitchens that receive orders
    CREATE TABLE IF NOT EXISTS public.order_book_suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Supplier company (production kitchen)
      company_id UUID NOT NULL,
      
      -- Business Information
      business_name TEXT NOT NULL,
      trading_name TEXT,
      
      -- Contact Information
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      postcode TEXT,
      country TEXT DEFAULT 'UK',
      
      -- Location (for distance calculations)
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      
      -- Delivery Configuration
      delivery_radius_km DECIMAL(5, 2) DEFAULT 50.00,
      delivery_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      order_cutoff_time TIME DEFAULT '14:00',
      order_cutoff_days INTEGER DEFAULT 1, -- Days before delivery
      
      -- Pricing & Terms
      payment_terms_days INTEGER DEFAULT 30,
      minimum_order_value DECIMAL(10, 2),
      
      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      is_approved BOOLEAN DEFAULT TRUE,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(company_id, business_name)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_suppliers_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_suppliers'
    ) THEN
      ALTER TABLE public.order_book_suppliers
      ADD CONSTRAINT order_book_suppliers_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_suppliers_company ON public.order_book_suppliers(company_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_suppliers_active ON public.order_book_suppliers(company_id, is_active) WHERE is_active = TRUE;
    CREATE INDEX IF NOT EXISTS idx_order_book_suppliers_location ON public.order_book_suppliers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

    -- ============================================================================
    -- CUSTOMERS (Cafes/Restaurants ordering from suppliers)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Customer company
      company_id UUID NOT NULL,
      
      -- Which supplier do they order from
      supplier_id UUID NOT NULL,
      
      -- Business Information
      business_name TEXT NOT NULL,
      trading_name TEXT,
      
      -- Contact Information
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      postcode TEXT,
      country TEXT DEFAULT 'UK',
      
      -- Location (for distance calculations)
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      
      -- Customer Status
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
      approved_at TIMESTAMPTZ,
      approved_by UUID, -- profile_id of supplier staff who approved
      
      -- Credit Terms
      credit_limit DECIMAL(10, 2),
      payment_terms_days INTEGER DEFAULT 30,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, business_name)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_customers_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_customers'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD CONSTRAINT order_book_customers_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_customers_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_customers'
    ) THEN
      ALTER TABLE public.order_book_customers
      ADD CONSTRAINT order_book_customers_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_book_customers_approved_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'order_book_customers'
      ) THEN
        ALTER TABLE public.order_book_customers
        ADD CONSTRAINT order_book_customers_approved_by_fkey
        FOREIGN KEY (approved_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_customers_supplier ON public.order_book_customers(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_customers_status ON public.order_book_customers(supplier_id, status);
    CREATE INDEX IF NOT EXISTS idx_order_book_customers_location ON public.order_book_customers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

    -- ============================================================================
    -- PRODUCTS (Items in supplier catalog)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Supplier that sells this product
      supplier_id UUID NOT NULL,
      
      -- Product Information
      name TEXT NOT NULL,
      description TEXT,
      sku TEXT,
      category TEXT,
      
      -- Pricing
      base_price DECIMAL(10, 2) NOT NULL,
      unit TEXT NOT NULL DEFAULT 'each', -- 'each', 'kg', 'box', etc.
      
      -- Bulk Discounts (stored as JSONB)
      -- Example: [{"min_qty": 10, "discount_percent": 5}, {"min_qty": 50, "discount_percent": 10}]
      bulk_discounts JSONB DEFAULT '[]'::jsonb,
      
      -- Customer-Specific Pricing
      -- Will be handled in separate table: order_book_customer_pricing
      
      -- Availability
      is_active BOOLEAN DEFAULT TRUE,
      is_available BOOLEAN DEFAULT TRUE,
      
      -- Display
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, name)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_products_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_products'
    ) THEN
      ALTER TABLE public.order_book_products
      ADD CONSTRAINT order_book_products_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_products_supplier ON public.order_book_products(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_products_active ON public.order_book_products(supplier_id, is_active) WHERE is_active = TRUE;

    -- ============================================================================
    -- CUSTOMER-SPECIFIC PRICING
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_customer_pricing (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      customer_id UUID NOT NULL,
      product_id UUID NOT NULL,
      
      -- Custom Price (NULL = use base_price)
      custom_price DECIMAL(10, 2),
      
      -- Custom Bulk Discounts (NULL = use product bulk_discounts)
      custom_bulk_discounts JSONB,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(customer_id, product_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_customer_pricing_customer_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_customer_pricing'
    ) THEN
      ALTER TABLE public.order_book_customer_pricing
      ADD CONSTRAINT order_book_customer_pricing_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.order_book_customers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_customer_pricing_product_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_customer_pricing'
    ) THEN
      ALTER TABLE public.order_book_customer_pricing
      ADD CONSTRAINT order_book_customer_pricing_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.order_book_products(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_customer_pricing_customer ON public.order_book_customer_pricing(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_customer_pricing_product ON public.order_book_customer_pricing(product_id);

    -- ============================================================================
    -- PRODUCTION PROFILES (How products are made)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_production_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      product_id UUID NOT NULL,
      
      -- Production Timing
      prep_lead_time_hours INTEGER NOT NULL DEFAULT 24, -- Hours before delivery
      bake_time_minutes INTEGER,
      cool_time_minutes INTEGER,
      total_production_time_minutes INTEGER,
      
      -- Batch Information
      batch_size INTEGER DEFAULT 1, -- Units per batch
      batch_yield INTEGER DEFAULT 1, -- Actual yield (may be less due to waste)
      
      -- Equipment Requirements
      -- Stored as JSONB array: [{"equipment_id": "...", "duration_minutes": 60, "capacity_percent": 80}]
      equipment_requirements JSONB DEFAULT '[]'::jsonb,
      
      -- Storage Requirements
      storage_type TEXT CHECK (storage_type IN ('ambient', 'chilled', 'frozen')),
      storage_space_per_unit DECIMAL(10, 4), -- e.g., 0.05 cubic meters per croissant
      
      -- Notes
      notes TEXT,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, product_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_production_profiles_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_production_profiles'
    ) THEN
      ALTER TABLE public.order_book_production_profiles
      ADD CONSTRAINT order_book_production_profiles_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_production_profiles_product_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_production_profiles'
    ) THEN
      ALTER TABLE public.order_book_production_profiles
      ADD CONSTRAINT order_book_production_profiles_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.order_book_products(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_production_profiles_product ON public.order_book_production_profiles(product_id);

    -- ============================================================================
    -- PRODUCT COMPONENTS (Bill of Materials - Ingredients)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_product_components (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      production_profile_id UUID NOT NULL,
      
      -- Ingredient Information
      ingredient_name TEXT NOT NULL,
      quantity_per_unit DECIMAL(10, 4) NOT NULL, -- e.g., 0.05 kg flour per croissant
      unit TEXT NOT NULL DEFAULT 'kg',
      
      -- Optional: Link to ingredient library (if integrated)
      ingredient_library_id UUID, -- Could reference stockly ingredients_library
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(production_profile_id, ingredient_name)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_product_components_profile_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_product_components'
    ) THEN
      ALTER TABLE public.order_book_product_components
      ADD CONSTRAINT order_book_product_components_profile_id_fkey
      FOREIGN KEY (production_profile_id) REFERENCES public.order_book_production_profiles(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_product_components_profile ON public.order_book_product_components(production_profile_id);

    -- ============================================================================
    -- EQUIPMENT (Ovens, fridges, mixers, etc.)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      
      -- Equipment Information
      name TEXT NOT NULL,
      equipment_type TEXT NOT NULL CHECK (equipment_type IN ('oven', 'fridge', 'freezer', 'mixer', 'proofer', 'other')),
      
      -- Capacity
      capacity_units INTEGER, -- e.g., 50 croissants per batch
      capacity_percent_max INTEGER DEFAULT 100, -- Max safe capacity (e.g., 95%)
      
      -- Scheduling
      available_from TIME DEFAULT '04:00',
      available_until TIME DEFAULT '20:00',
      available_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      
      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, name)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_equipment_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_equipment'
    ) THEN
      ALTER TABLE public.order_book_equipment
      ADD CONSTRAINT order_book_equipment_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_equipment_supplier ON public.order_book_equipment(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_equipment_active ON public.order_book_equipment(supplier_id, is_active) WHERE is_active = TRUE;

    -- ============================================================================
    -- ORDERS (Customer orders - the trigger for production)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      customer_id UUID NOT NULL,
      
      -- Order Reference
      order_number TEXT NOT NULL, -- Auto-generated: OB-YYYYMMDD-001
      
      -- Dates
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      delivery_date DATE NOT NULL,
      confirmed_at TIMESTAMPTZ,
      locked_at TIMESTAMPTZ, -- When order is locked (past cutoff)
      
      -- Status
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'confirmed', 'locked', 'in_production', 'ready', 'delivered', 'cancelled'
      )),
      
      -- Pricing
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(10, 2) DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      
      -- Notes
      customer_notes TEXT,
      supplier_notes TEXT,
      
      -- Metadata
      created_by UUID, -- profile_id of customer user
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, order_number)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_orders_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_orders'
    ) THEN
      ALTER TABLE public.order_book_orders
      ADD CONSTRAINT order_book_orders_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_orders_customer_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_orders'
    ) THEN
      ALTER TABLE public.order_book_orders
      ADD CONSTRAINT order_book_orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.order_book_customers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_book_orders_created_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'order_book_orders'
      ) THEN
        ALTER TABLE public.order_book_orders
        ADD CONSTRAINT order_book_orders_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_orders_supplier ON public.order_book_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_orders_customer ON public.order_book_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_orders_delivery_date ON public.order_book_orders(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_order_book_orders_status ON public.order_book_orders(supplier_id, status, delivery_date);

    -- ============================================================================
    -- ORDER ITEMS (Products in each order)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      order_id UUID NOT NULL,
      product_id UUID NOT NULL,
      
      -- Quantities
      quantity DECIMAL(10, 2) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      discount_percent DECIMAL(5, 2) DEFAULT 0,
      line_total DECIMAL(10, 2) NOT NULL,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(order_id, product_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_order_items_order_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_order_items'
    ) THEN
      ALTER TABLE public.order_book_order_items
      ADD CONSTRAINT order_book_order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.order_book_orders(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_order_items_product_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_order_items'
    ) THEN
      ALTER TABLE public.order_book_order_items
      ADD CONSTRAINT order_book_order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.order_book_products(id) ON DELETE RESTRICT;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_order_items_order ON public.order_book_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_order_items_product ON public.order_book_order_items(product_id);

    -- ============================================================================
    -- STANDING ORDERS (Recurring order patterns)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_standing_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      customer_id UUID NOT NULL,
      
      -- Schedule
      delivery_days TEXT[] NOT NULL, -- e.g., ['tuesday', 'friday']
      start_date DATE NOT NULL,
      end_date DATE, -- NULL = no end date
      
      -- Status
      is_active BOOLEAN DEFAULT TRUE,
      is_paused BOOLEAN DEFAULT FALSE,
      
      -- Products and Quantities (stored as JSONB)
      -- Example: [{"product_id": "...", "quantity": 12}, {"product_id": "...", "quantity": 6}]
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, customer_id) -- One standing order per customer per supplier
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_standing_orders_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_standing_orders'
    ) THEN
      ALTER TABLE public.order_book_standing_orders
      ADD CONSTRAINT order_book_standing_orders_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_standing_orders_customer_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_standing_orders'
    ) THEN
      ALTER TABLE public.order_book_standing_orders
      ADD CONSTRAINT order_book_standing_orders_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.order_book_customers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_standing_orders_supplier ON public.order_book_standing_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_standing_orders_customer ON public.order_book_standing_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_standing_orders_active ON public.order_book_standing_orders(supplier_id, is_active) WHERE is_active = TRUE;

    -- ============================================================================
    -- STANDING ORDER SKIPS (Skip specific delivery dates)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_standing_order_skips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      standing_order_id UUID NOT NULL,
      skip_date DATE NOT NULL,
      
      reason TEXT,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(standing_order_id, skip_date)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_standing_order_skips_standing_order_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_standing_order_skips'
    ) THEN
      ALTER TABLE public.order_book_standing_order_skips
      ADD CONSTRAINT order_book_standing_order_skips_standing_order_id_fkey
      FOREIGN KEY (standing_order_id) REFERENCES public.order_book_standing_orders(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_standing_order_skips_standing_order ON public.order_book_standing_order_skips(standing_order_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_standing_order_skips_date ON public.order_book_standing_order_skips(skip_date);

    -- ============================================================================
    -- PRODUCTION SCHEDULE (Auto-generated production plan)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_production_schedule (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      delivery_date DATE NOT NULL,
      
      -- Summary
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
      
      -- Timeline (stored as JSONB)
      -- Example: [
      --   {"stage": "prep", "date": "2025-01-06", "time": "14:00", "tasks": [...]},
      --   {"stage": "bake", "date": "2025-01-07", "time": "04:00", "tasks": [...]}
      -- ]
      timeline JSONB DEFAULT '[]'::jsonb,
      
      -- Capacity Warnings
      capacity_warnings JSONB DEFAULT '[]'::jsonb,
      -- Example: [{"equipment_id": "...", "equipment_name": "Oven 1", "utilization_percent": 95, "warning": "TIGHT"}]
      
      -- Status
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'complete')),
      last_calculated_at TIMESTAMPTZ,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, delivery_date)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_production_schedule_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_production_schedule'
    ) THEN
      ALTER TABLE public.order_book_production_schedule
      ADD CONSTRAINT order_book_production_schedule_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_production_schedule_supplier ON public.order_book_production_schedule(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_production_schedule_date ON public.order_book_production_schedule(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_order_book_production_schedule_status ON public.order_book_production_schedule(supplier_id, status, delivery_date);

    -- ============================================================================
    -- INGREDIENT PULLS (Shopping lists for production)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_ingredient_pulls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      delivery_date DATE NOT NULL,
      prep_date DATE NOT NULL, -- When ingredients need to be pulled
      
      -- Ingredients (stored as JSONB)
      -- Example: [
      --   {"ingredient_name": "Flour", "quantity": 5.0, "unit": "kg", "in_stock": true, "stock_level": 10.0},
      --   {"ingredient_name": "Almond paste", "quantity": 0.5, "unit": "kg", "in_stock": true, "stock_level": 0.6, "warning": "low"}
      -- ]
      ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
      
      -- Status
      is_complete BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      completed_by UUID, -- profile_id
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, delivery_date, prep_date)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_ingredient_pulls_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_ingredient_pulls'
    ) THEN
      ALTER TABLE public.order_book_ingredient_pulls
      ADD CONSTRAINT order_book_ingredient_pulls_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_book_ingredient_pulls_completed_by_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'order_book_ingredient_pulls'
      ) THEN
        ALTER TABLE public.order_book_ingredient_pulls
        ADD CONSTRAINT order_book_ingredient_pulls_completed_by_fkey
        FOREIGN KEY (completed_by) REFERENCES public.profiles(id);
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_ingredient_pulls_supplier ON public.order_book_ingredient_pulls(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_ingredient_pulls_dates ON public.order_book_ingredient_pulls(delivery_date, prep_date);

    -- ============================================================================
    -- STORAGE REQUIREMENTS (Fridge/Freezer space calculations)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_storage_requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      delivery_date DATE NOT NULL,
      
      -- Storage Type
      storage_type TEXT NOT NULL CHECK (storage_type IN ('ambient', 'chilled', 'frozen')),
      
      -- Space Requirements
      required_space_cubic_m DECIMAL(10, 4) NOT NULL,
      available_space_cubic_m DECIMAL(10, 4),
      utilization_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
          WHEN available_space_cubic_m > 0 
          THEN (required_space_cubic_m / available_space_cubic_m * 100)::DECIMAL(5, 2)
          ELSE NULL
        END
      ) STORED,
      
      -- Warnings
      has_warning BOOLEAN DEFAULT FALSE,
      warning_message TEXT,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, delivery_date, storage_type)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_storage_requirements_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_storage_requirements'
    ) THEN
      ALTER TABLE public.order_book_storage_requirements
      ADD CONSTRAINT order_book_storage_requirements_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_storage_requirements_supplier ON public.order_book_storage_requirements(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_storage_requirements_date ON public.order_book_storage_requirements(delivery_date);

    -- ============================================================================
    -- INVOICES (Billing)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS public.order_book_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      supplier_id UUID NOT NULL,
      customer_id UUID NOT NULL,
      
      -- Invoice Reference
      invoice_number TEXT NOT NULL, -- Auto-generated: INV-YYYYMMDD-001
      
      -- Dates
      invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date DATE NOT NULL,
      paid_at TIMESTAMPTZ,
      
      -- Order References (can invoice multiple orders)
      order_ids UUID[] NOT NULL, -- Array of order_book_orders.id
      
      -- Pricing
      subtotal DECIMAL(10, 2) NOT NULL,
      tax_amount DECIMAL(10, 2) DEFAULT 0,
      total DECIMAL(10, 2) NOT NULL,
      
      -- Payment
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
      payment_method TEXT,
      payment_reference TEXT,
      
      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      UNIQUE(supplier_id, invoice_number)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_invoices_supplier_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_invoices'
    ) THEN
      ALTER TABLE public.order_book_invoices
      ADD CONSTRAINT order_book_invoices_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES public.order_book_suppliers(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_book_invoices_customer_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'order_book_invoices'
    ) THEN
      ALTER TABLE public.order_book_invoices
      ADD CONSTRAINT order_book_invoices_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.order_book_customers(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_order_book_invoices_supplier ON public.order_book_invoices(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_invoices_customer ON public.order_book_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_book_invoices_status ON public.order_book_invoices(supplier_id, status);
    CREATE INDEX IF NOT EXISTS idx_order_book_invoices_due_date ON public.order_book_invoices(due_date) WHERE status IN ('sent', 'overdue');

    RAISE NOTICE '✅ Order Book schema tables created successfully';

  ELSE
    RAISE NOTICE '⚠️ companies or profiles tables do not exist yet - skipping Order Book schema creation';
  END IF;
END $$;

