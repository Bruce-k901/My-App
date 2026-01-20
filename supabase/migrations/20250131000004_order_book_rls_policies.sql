-- ============================================================================
-- Migration: Order Book RLS Policies
-- Description: Row Level Security policies for all Order Book tables
-- Patterns: Supplier isolation, customer self-access, order access control
-- ============================================================================

DO $$
BEGIN
  -- Enable RLS on all Order Book tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_suppliers') THEN
    ALTER TABLE public.order_book_suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_customers') THEN
    ALTER TABLE public.order_book_customers ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_products') THEN
    ALTER TABLE public.order_book_products ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_customer_pricing') THEN
    ALTER TABLE public.order_book_customer_pricing ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_profiles') THEN
    ALTER TABLE public.order_book_production_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_product_components') THEN
    ALTER TABLE public.order_book_product_components ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_equipment') THEN
    ALTER TABLE public.order_book_equipment ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_orders') THEN
    ALTER TABLE public.order_book_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_order_items') THEN
    ALTER TABLE public.order_book_order_items ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_standing_orders') THEN
    ALTER TABLE public.order_book_standing_orders ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_standing_order_skips') THEN
    ALTER TABLE public.order_book_standing_order_skips ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_schedule') THEN
    ALTER TABLE public.order_book_production_schedule ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_ingredient_pulls') THEN
    ALTER TABLE public.order_book_ingredient_pulls ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_storage_requirements') THEN
    ALTER TABLE public.order_book_storage_requirements ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_invoices') THEN
    ALTER TABLE public.order_book_invoices ENABLE ROW LEVEL SECURITY;
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_SUPPLIERS Policies
  -- ============================================================================
  -- Suppliers can view/update their own supplier record
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_suppliers') THEN
    DROP POLICY IF EXISTS order_book_suppliers_select ON public.order_book_suppliers;
    CREATE POLICY order_book_suppliers_select ON public.order_book_suppliers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = order_book_suppliers.company_id
        )
      );
    
    DROP POLICY IF EXISTS order_book_suppliers_update ON public.order_book_suppliers;
    CREATE POLICY order_book_suppliers_update ON public.order_book_suppliers
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = order_book_suppliers.company_id
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_CUSTOMERS Policies
  -- ============================================================================
  -- Suppliers can view their customers, customers can view themselves
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_customers') THEN
    DROP POLICY IF EXISTS order_book_customers_select ON public.order_book_customers;
    CREATE POLICY order_book_customers_select ON public.order_book_customers
      FOR SELECT USING (
        -- Supplier can see their customers
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_customers.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customer can see themselves
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = order_book_customers.company_id
        )
      );
    
    DROP POLICY IF EXISTS order_book_customers_insert ON public.order_book_customers;
    CREATE POLICY order_book_customers_insert ON public.order_book_customers
      FOR INSERT WITH CHECK (
        -- Suppliers can create customer records (approval workflow)
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_customers.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customers can create their own record (self-signup)
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = order_book_customers.company_id
        )
      );
    
    DROP POLICY IF EXISTS order_book_customers_update ON public.order_book_customers;
    CREATE POLICY order_book_customers_update ON public.order_book_customers
      FOR UPDATE USING (
        -- Suppliers can update customer records (approve, suspend, etc.)
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_customers.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customers can update their own record (profile info)
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = order_book_customers.company_id
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_PRODUCTS Policies
  -- ============================================================================
  -- Suppliers manage their products, customers can view catalog
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_products') THEN
    DROP POLICY IF EXISTS order_book_products_select ON public.order_book_products;
    CREATE POLICY order_book_products_select ON public.order_book_products
      FOR SELECT USING (
        -- Suppliers can see their products
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_products.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customers can see products from their supplier
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.supplier_id = order_book_products.supplier_id
            AND c.status = 'active'
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_products_insert ON public.order_book_products;
    CREATE POLICY order_book_products_insert ON public.order_book_products
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_products.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_products_update ON public.order_book_products;
    CREATE POLICY order_book_products_update ON public.order_book_products
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_products.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_products_delete ON public.order_book_products;
    CREATE POLICY order_book_products_delete ON public.order_book_products
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_products.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_CUSTOMER_PRICING Policies
  -- ============================================================================
  -- Suppliers manage pricing, customers can view their prices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_customer_pricing') THEN
    DROP POLICY IF EXISTS order_book_customer_pricing_select ON public.order_book_customer_pricing;
    CREATE POLICY order_book_customer_pricing_select ON public.order_book_customer_pricing
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.order_book_suppliers s ON s.id = c.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE c.id = order_book_customer_pricing.customer_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_customer_pricing.customer_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_customer_pricing_insert ON public.order_book_customer_pricing;
    CREATE POLICY order_book_customer_pricing_insert ON public.order_book_customer_pricing
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.order_book_suppliers s ON s.id = c.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE c.id = order_book_customer_pricing.customer_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_customer_pricing_update ON public.order_book_customer_pricing;
    CREATE POLICY order_book_customer_pricing_update ON public.order_book_customer_pricing
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.order_book_suppliers s ON s.id = c.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE c.id = order_book_customer_pricing.customer_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_ORDERS Policies
  -- ============================================================================
  -- Suppliers see all orders, customers see only their orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_orders') THEN
    DROP POLICY IF EXISTS order_book_orders_select ON public.order_book_orders;
    CREATE POLICY order_book_orders_select ON public.order_book_orders
      FOR SELECT USING (
        -- Supplier can see all orders
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_orders.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customer can see their own orders
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_orders.customer_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_orders_insert ON public.order_book_orders;
    CREATE POLICY order_book_orders_insert ON public.order_book_orders
      FOR INSERT WITH CHECK (
        -- Customers can create orders
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_orders.customer_id
            AND c.status = 'active'
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_orders_update ON public.order_book_orders;
    CREATE POLICY order_book_orders_update ON public.order_book_orders
      FOR UPDATE USING (
        -- Suppliers can update orders
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_orders.supplier_id
            AND p.id = auth.uid()
        )
        OR
        -- Customers can update their orders (if not locked)
        (
          EXISTS (
            SELECT 1 FROM public.order_book_customers c
            JOIN public.profiles p ON p.company_id = c.company_id
            WHERE c.id = order_book_orders.customer_id
              AND p.id = auth.uid()
          )
          AND order_book_orders.locked_at IS NULL
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_ORDER_ITEMS Policies
  -- ============================================================================
  -- Same access as orders (via order_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_order_items') THEN
    DROP POLICY IF EXISTS order_book_order_items_select ON public.order_book_order_items;
    CREATE POLICY order_book_order_items_select ON public.order_book_order_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          JOIN public.order_book_suppliers s ON s.id = o.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE o.id = order_book_order_items.order_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          JOIN public.order_book_customers c ON c.id = o.customer_id
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE o.id = order_book_order_items.order_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_order_items_insert ON public.order_book_order_items;
    CREATE POLICY order_book_order_items_insert ON public.order_book_order_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          JOIN public.order_book_customers c ON c.id = o.customer_id
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE o.id = order_book_order_items.order_id
            AND o.locked_at IS NULL
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_order_items_update ON public.order_book_order_items;
    CREATE POLICY order_book_order_items_update ON public.order_book_order_items
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          JOIN public.order_book_suppliers s ON s.id = o.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE o.id = order_book_order_items.order_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          JOIN public.order_book_customers c ON c.id = o.customer_id
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE o.id = order_book_order_items.order_id
            AND o.locked_at IS NULL
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_order_items_delete ON public.order_book_order_items;
    CREATE POLICY order_book_order_items_delete ON public.order_book_order_items
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_orders o
          WHERE o.id = order_book_order_items.order_id
            AND (
              EXISTS (
                SELECT 1 FROM public.order_book_suppliers s
                JOIN public.profiles p ON p.company_id = s.company_id
                WHERE s.id = o.supplier_id AND p.id = auth.uid()
              )
              OR
              (
                EXISTS (
                  SELECT 1 FROM public.order_book_customers c
                  JOIN public.profiles p ON p.company_id = c.company_id
                  WHERE c.id = o.customer_id AND o.locked_at IS NULL AND p.id = auth.uid()
                )
              )
            )
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_STANDING_ORDERS Policies
  -- ============================================================================
  -- Same access pattern as orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_standing_orders') THEN
    DROP POLICY IF EXISTS order_book_standing_orders_select ON public.order_book_standing_orders;
    CREATE POLICY order_book_standing_orders_select ON public.order_book_standing_orders
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_standing_orders.supplier_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_standing_orders.customer_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_standing_orders_insert ON public.order_book_standing_orders;
    CREATE POLICY order_book_standing_orders_insert ON public.order_book_standing_orders
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_standing_orders.customer_id
            AND c.status = 'active'
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_standing_orders_update ON public.order_book_standing_orders;
    CREATE POLICY order_book_standing_orders_update ON public.order_book_standing_orders
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_standing_orders.supplier_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_standing_orders.customer_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_PRODUCTION_SCHEDULE, INGREDIENT_PULLS, STORAGE_REQUIREMENTS
  -- ============================================================================
  -- Supplier-only access (internal planning)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_schedule') THEN
    DROP POLICY IF EXISTS order_book_production_schedule_select ON public.order_book_production_schedule;
    CREATE POLICY order_book_production_schedule_select ON public.order_book_production_schedule
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_schedule.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_ingredient_pulls') THEN
    DROP POLICY IF EXISTS order_book_ingredient_pulls_select ON public.order_book_ingredient_pulls;
    CREATE POLICY order_book_ingredient_pulls_select ON public.order_book_ingredient_pulls
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_ingredient_pulls.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_ingredient_pulls_update ON public.order_book_ingredient_pulls;
    CREATE POLICY order_book_ingredient_pulls_update ON public.order_book_ingredient_pulls
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_ingredient_pulls.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_storage_requirements') THEN
    DROP POLICY IF EXISTS order_book_storage_requirements_select ON public.order_book_storage_requirements;
    CREATE POLICY order_book_storage_requirements_select ON public.order_book_storage_requirements
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_storage_requirements.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- ORDER_BOOK_INVOICES Policies
  -- ============================================================================
  -- Suppliers and customers can view invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_invoices') THEN
    DROP POLICY IF EXISTS order_book_invoices_select ON public.order_book_invoices;
    CREATE POLICY order_book_invoices_select ON public.order_book_invoices
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_invoices.supplier_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_customers c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = order_book_invoices.customer_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_invoices_insert ON public.order_book_invoices;
    CREATE POLICY order_book_invoices_insert ON public.order_book_invoices
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_invoices.supplier_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_invoices_update ON public.order_book_invoices;
    CREATE POLICY order_book_invoices_update ON public.order_book_invoices
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_invoices.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  -- ============================================================================
  -- Production Profiles, Components, Equipment - Supplier only
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_production_profiles') THEN
    DROP POLICY IF EXISTS order_book_production_profiles_select ON public.order_book_production_profiles;
    CREATE POLICY order_book_production_profiles_select ON public.order_book_production_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_production_profiles.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_product_components') THEN
    DROP POLICY IF EXISTS order_book_product_components_select ON public.order_book_product_components;
    CREATE POLICY order_book_product_components_select ON public.order_book_product_components
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_production_profiles pp
          JOIN public.order_book_suppliers s ON s.id = pp.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE pp.id = order_book_product_components.production_profile_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_equipment') THEN
    DROP POLICY IF EXISTS order_book_equipment_select ON public.order_book_equipment;
    CREATE POLICY order_book_equipment_select ON public.order_book_equipment
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_suppliers s
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE s.id = order_book_equipment.supplier_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_book_standing_order_skips') THEN
    DROP POLICY IF EXISTS order_book_standing_order_skips_select ON public.order_book_standing_order_skips;
    CREATE POLICY order_book_standing_order_skips_select ON public.order_book_standing_order_skips
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.order_book_standing_orders so
          JOIN public.order_book_suppliers s ON s.id = so.supplier_id
          JOIN public.profiles p ON p.company_id = s.company_id
          WHERE so.id = order_book_standing_order_skips.standing_order_id
            AND p.id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.order_book_standing_orders so
          JOIN public.order_book_customers c ON c.id = so.customer_id
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE so.id = order_book_standing_order_skips.standing_order_id
            AND p.id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS order_book_standing_order_skips_insert ON public.order_book_standing_order_skips;
    CREATE POLICY order_book_standing_order_skips_insert ON public.order_book_standing_order_skips
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.order_book_standing_orders so
          JOIN public.order_book_customers c ON c.id = so.customer_id
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE so.id = order_book_standing_order_skips.standing_order_id
            AND p.id = auth.uid()
        )
      );
  END IF;

  RAISE NOTICE '✅ Order Book RLS policies created successfully';
END $$;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

