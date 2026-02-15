-- ============================================================================
-- Migration: Fix Order Number Generation Race Condition
-- Description: Updates generate_order_number function to handle concurrent inserts
--              Uses advisory locks to prevent duplicate order numbers
-- ============================================================================

-- Drop and recreate the function with advisory lock for concurrency safety
CREATE OR REPLACE FUNCTION public.generate_order_number(supplier_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_prefix TEXT;
  last_number INTEGER;
  new_number TEXT;
  lock_id INTEGER;
BEGIN
  -- Use supplier_id hash as lock ID (converted to integer)
  -- This ensures we only lock for the same supplier, allowing parallel inserts for different suppliers
  lock_id := abs(hashtext(supplier_id_param::TEXT)) % 2147483647;
  
  -- Acquire advisory lock for this supplier
  PERFORM pg_advisory_xact_lock(lock_id);
  
  -- Format: OB-YYYYMMDD
  today_prefix := 'OB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
  
  -- Find the highest number for today (locked, so no race condition)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(
          order_number 
          FROM LENGTH(today_prefix) + 1 
          FOR 3
        ) AS INTEGER
      )
    ), 
    0
  )
  INTO last_number
  FROM public.order_book_orders
  WHERE supplier_id = supplier_id_param
    AND order_number LIKE today_prefix || '%';
  
  -- Increment and format with leading zeros
  new_number := today_prefix || LPAD((last_number + 1)::TEXT, 3, '0');
  
  -- Lock is automatically released at transaction end
  RETURN new_number;
END;
$$;

