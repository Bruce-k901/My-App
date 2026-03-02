-- ============================================================================
-- Migration: Fix DELETE RLS policies for purchase orders
-- Description: Simpler approach - allow delete for records user can view
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can delete purchase order lines" ON public.purchase_order_lines;
DROP POLICY IF EXISTS "Users can delete purchase orders" ON public.purchase_orders;

-- Add DELETE policy for purchase_order_lines - allow if they can select it
CREATE POLICY "Allow delete purchase order lines"
ON public.purchase_order_lines
FOR DELETE
TO authenticated
USING (true);  -- If RLS allows SELECT, it should allow DELETE

-- Add DELETE policy for purchase_orders - allow if they can select it
CREATE POLICY "Allow delete purchase orders"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (true);  -- If RLS allows SELECT, it should allow DELETE

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
