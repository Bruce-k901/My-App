-- Fix RLS policies on order_book_standing_orders to allow authenticated users

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can manage standing orders" ON order_book_standing_orders;

-- Enable RLS
ALTER TABLE order_book_standing_orders ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage standing orders
-- This includes both admin users and customer portal users
CREATE POLICY "Authenticated users can manage standing orders"
  ON order_book_standing_orders
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
