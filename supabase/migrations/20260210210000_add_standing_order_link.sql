-- Add standing_order_id to planly_orders to track auto-generated orders
ALTER TABLE public.planly_orders
ADD COLUMN IF NOT EXISTS standing_order_id UUID REFERENCES public.planly_standing_orders(id) ON DELETE SET NULL;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_planly_orders_standing_order
  ON public.planly_orders(standing_order_id);

-- Add comment
COMMENT ON COLUMN public.planly_orders.standing_order_id IS
  'Links to the standing order that generated this order (if auto-generated)';
