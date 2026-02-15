-- ============================================================================
-- Migration: Customer Management RLS Policies
-- Description: Row Level Security policies for order_book_customers and portal_invitations
-- ============================================================================

DO $$
BEGIN
  -- Enable RLS on order_book_customers
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_customers'
  ) THEN
    ALTER TABLE public.order_book_customers ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist (for idempotency)
    DROP POLICY IF EXISTS "Suppliers view their customers" ON public.order_book_customers;
    DROP POLICY IF EXISTS "Suppliers create customers" ON public.order_book_customers;
    DROP POLICY IF EXISTS "Suppliers update their customers" ON public.order_book_customers;
    DROP POLICY IF EXISTS "Customers view own record" ON public.order_book_customers;
    DROP POLICY IF EXISTS "Customers update own record" ON public.order_book_customers;

    -- Policy 1: Suppliers can view their customers
    CREATE POLICY "Suppliers view their customers"
    ON public.order_book_customers FOR SELECT
    USING (
      supplier_id IN (
        SELECT id FROM public.order_book_suppliers
        WHERE company_id IN (
          SELECT company_id FROM public.profiles 
          WHERE auth_user_id = auth.uid() OR id = auth.uid()
        )
      )
    );

    -- Policy 2: Suppliers can create customers
    CREATE POLICY "Suppliers create customers"
    ON public.order_book_customers FOR INSERT
    WITH CHECK (
      supplier_id IN (
        SELECT id FROM public.order_book_suppliers
        WHERE company_id IN (
          SELECT company_id FROM public.profiles 
          WHERE auth_user_id = auth.uid() OR id = auth.uid()
        )
      )
    );

    -- Policy 3: Suppliers can update their customers
    CREATE POLICY "Suppliers update their customers"
    ON public.order_book_customers FOR UPDATE
    USING (
      supplier_id IN (
        SELECT id FROM public.order_book_suppliers
        WHERE company_id IN (
          SELECT company_id FROM public.profiles 
          WHERE auth_user_id = auth.uid() OR id = auth.uid()
        )
      )
    );

    -- Policy 4: Customers can view their own record
    CREATE POLICY "Customers view own record"
    ON public.order_book_customers FOR SELECT
    USING (auth_user_id = auth.uid());

    -- Policy 5: Customers can update their own record (limited fields)
    -- Note: Customers should only be able to update certain fields, not all
    -- For now, allow update but in practice, limit via application logic
    CREATE POLICY "Customers update own record"
    ON public.order_book_customers FOR UPDATE
    USING (auth_user_id = auth.uid());

    RAISE NOTICE '✅ RLS policies created for order_book_customers';
  END IF;

  -- Enable RLS on portal_invitations
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'portal_invitations'
  ) THEN
    ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Suppliers manage invitations for their customers" ON public.portal_invitations;
    DROP POLICY IF EXISTS "Public read invitations by token" ON public.portal_invitations;

    -- Policy 6: Suppliers can manage invitations for their customers
    CREATE POLICY "Suppliers manage invitations for their customers"
    ON public.portal_invitations FOR ALL
    USING (
      customer_id IN (
        SELECT id FROM public.order_book_customers
        WHERE supplier_id IN (
          SELECT id FROM public.order_book_suppliers
          WHERE company_id IN (
            SELECT company_id FROM public.profiles 
            WHERE auth_user_id = auth.uid() OR id = auth.uid()
          )
        )
      )
    );

    -- Policy 7: Public can read invitations by token (for setup page)
    -- This allows the setup page to validate tokens without authentication
    CREATE POLICY "Public read invitations by token"
    ON public.portal_invitations FOR SELECT
    USING (true);

    RAISE NOTICE '✅ RLS policies created for portal_invitations';
  END IF;

END $$;

