-- ============================================================================
-- Migration: Add DELETE RLS policies for purchase orders
-- Description: Enables DELETE operations through RLS policies
-- ============================================================================

-- Add DELETE policy for purchase_order_lines
DO $$
BEGIN
  -- Drop existing policy if any
  DROP POLICY IF EXISTS "Users can delete purchase order lines" ON public.purchase_order_lines;

  -- Create DELETE policy
  CREATE POLICY "Users can delete purchase order lines"
  ON public.purchase_order_lines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.company_id IN (
        SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
      )
    )
  );

  RAISE NOTICE 'Added DELETE policy for purchase_order_lines';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table purchase_order_lines does not exist in public schema';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policy for purchase_order_lines: %', SQLERRM;
END $$;

-- Add DELETE policy for purchase_orders
DO $$
BEGIN
  -- Drop existing policy if any
  DROP POLICY IF EXISTS "Users can delete purchase orders" ON public.purchase_orders;

  -- Create DELETE policy
  CREATE POLICY "Users can delete purchase orders"
  ON public.purchase_orders
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

  RAISE NOTICE 'Added DELETE policy for purchase_orders';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table purchase_orders does not exist in public schema';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policy for purchase_orders: %', SQLERRM;
END $$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
