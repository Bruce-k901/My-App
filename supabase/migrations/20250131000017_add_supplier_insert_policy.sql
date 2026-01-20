-- ============================================================================
-- Migration: Add INSERT policy for order_book_suppliers
-- Description: Allows users to create supplier records for their own company
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_suppliers'
  ) THEN
    -- Drop existing INSERT policy if it exists
    DROP POLICY IF EXISTS order_book_suppliers_insert ON public.order_book_suppliers;
    
    -- Create INSERT policy: Users can create supplier records for their own company
    CREATE POLICY order_book_suppliers_insert ON public.order_book_suppliers
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = order_book_suppliers.company_id
        )
      );
    
    RAISE NOTICE '✅ INSERT policy created for order_book_suppliers';
  END IF;
END $$;

