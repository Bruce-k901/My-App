-- ============================================================================
-- Migration: Generate Orders From Week
-- Description: Function to copy orders from a specific week to all future weeks
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_orders_from_week()
-- ============================================================================
-- Takes orders from a specific week and creates the same orders for all future weeks
-- Parameters:
--   p_customer_id: Customer to generate orders for
--   p_week_start_date: First day of the week to copy from (Monday)
--   p_weeks_ahead: How many weeks ahead to generate (default: 4 weeks)
CREATE OR REPLACE FUNCTION public.generate_orders_from_week(
  p_customer_id UUID,
  p_week_start_date DATE,
  p_weeks_ahead INTEGER DEFAULT 4
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  generated_count INTEGER := 0;
  week_end_date DATE;
  order_record RECORD;
  order_item_record RECORD;
  new_order_id UUID;
  target_week_start DATE;
  target_date DATE;
  day_offset INTEGER;
  day_name TEXT;
  week_num INTEGER;
BEGIN
  -- Calculate end of source week (Sunday)
  week_end_date := p_week_start_date + INTERVAL '6 days';
  
  -- Loop through all orders in the source week
  FOR order_record IN
    SELECT 
      o.id,
      o.supplier_id,
      o.delivery_date,
      o.status,
      o.customer_notes
    FROM public.order_book_orders o
    WHERE o.customer_id = p_customer_id
      AND o.delivery_date >= p_week_start_date
      AND o.delivery_date <= week_end_date
      AND o.status != 'cancelled'
    ORDER BY o.delivery_date
  LOOP
    -- Calculate day offset from week start (0 = Monday, 1 = Tuesday, etc.)
    day_offset := order_record.delivery_date - p_week_start_date;
    
    -- Ensure day_offset is between 0 and 6
    IF day_offset < 0 OR day_offset > 6 THEN
      CONTINUE; -- Skip if date is outside the week
    END IF;
    
    -- Generate orders for each future week
    FOR week_num IN 1..p_weeks_ahead LOOP
      -- Calculate target week start (Monday of target week)
      target_week_start := p_week_start_date + (week_num * INTERVAL '7 days');
      -- Calculate target date (same day of week as source)
      target_date := target_week_start + (day_offset || ' days')::INTERVAL;
      
      -- Only generate if target date is in the future
      IF target_date > CURRENT_DATE THEN
        -- Check if order already exists for this date
        IF NOT EXISTS (
          SELECT 1 FROM public.order_book_orders o
          WHERE o.supplier_id = order_record.supplier_id
            AND o.customer_id = p_customer_id
            AND o.delivery_date = target_date
        ) THEN
          -- Create the new order
          INSERT INTO public.order_book_orders (
            supplier_id,
            customer_id,
            delivery_date,
            status,
            subtotal,
            total,
            customer_notes
          )
          VALUES (
            order_record.supplier_id,
            p_customer_id,
            target_date,
            'confirmed',
            0,
            0,
            order_record.customer_notes
          )
          RETURNING id INTO new_order_id;
          
          -- Copy all order items from source order
          FOR order_item_record IN
            SELECT 
              oi.product_id,
              oi.quantity,
              oi.unit_price,
              oi.line_total
            FROM public.order_book_order_items oi
            WHERE oi.order_id = order_record.id
          LOOP
            -- Insert order item
            INSERT INTO public.order_book_order_items (
              order_id,
              product_id,
              quantity,
              unit_price,
              line_total
            )
            VALUES (
              new_order_id,
              order_item_record.product_id,
              order_item_record.quantity,
              order_item_record.unit_price,
              order_item_record.line_total
            );
          END LOOP;
          
          -- Update order totals
          UPDATE public.order_book_orders
          SET 
            subtotal = (
              SELECT COALESCE(SUM(line_total), 0)
              FROM public.order_book_order_items
              WHERE order_id = new_order_id
            ),
            total = (
              SELECT COALESCE(SUM(line_total), 0)
              FROM public.order_book_order_items
              WHERE order_id = new_order_id
            ),
            confirmed_at = NOW()
          WHERE id = new_order_id;
          
          generated_count := generated_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN generated_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_orders_from_week(UUID, DATE, INTEGER) TO authenticated;

