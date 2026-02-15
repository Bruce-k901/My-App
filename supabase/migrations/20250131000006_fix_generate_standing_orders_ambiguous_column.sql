-- ============================================================================
-- Migration: Fix generate_standing_orders ambiguous column reference
-- Description: Fixes the ambiguous delivery_date reference in generate_standing_orders function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_standing_orders(days_ahead INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  generated_count INTEGER := 0;
  standing_order_record RECORD;
  delivery_date DATE;
  day_name TEXT;
  order_id UUID;
  item_record JSONB;
  product_record RECORD;
  customer_pricing_record RECORD;
  base_price DECIMAL(10, 2);
  final_price DECIMAL(10, 2);
  subtotal DECIMAL(10, 2) := 0;
  order_total DECIMAL(10, 2) := 0;
BEGIN
  -- Loop through all active standing orders
  FOR standing_order_record IN
    SELECT 
      so.id,
      so.supplier_id,
      so.customer_id,
      so.delivery_days,
      so.items,
      so.start_date,
      so.end_date
    FROM public.order_book_standing_orders so
    WHERE so.is_active = TRUE
      AND so.is_paused = FALSE
      AND so.start_date <= CURRENT_DATE + days_ahead
      AND (so.end_date IS NULL OR so.end_date >= CURRENT_DATE)
  LOOP
    -- Loop through each day in the range
    FOR delivery_date IN
      SELECT generate_series(CURRENT_DATE, CURRENT_DATE + days_ahead - 1, '1 day'::interval)::DATE
    LOOP
      -- Get day name (lowercase, e.g., 'tuesday')
      day_name := LOWER(TO_CHAR(delivery_date, 'Day'));
      day_name := TRIM(day_name);
      
      -- Check if this day is in the standing order's delivery_days
      IF day_name = ANY(standing_order_record.delivery_days) THEN
        -- Check if order already exists (use table alias to avoid ambiguity)
        IF NOT EXISTS (
          SELECT 1 FROM public.order_book_orders o
          WHERE o.supplier_id = standing_order_record.supplier_id
            AND o.customer_id = standing_order_record.customer_id
            AND o.delivery_date = delivery_date
        ) THEN
          -- Check if this date is skipped
          IF NOT EXISTS (
            SELECT 1 FROM public.order_book_standing_order_skips
            WHERE standing_order_id = standing_order_record.id
              AND skip_date = delivery_date
          ) THEN
            -- Create the order
            INSERT INTO public.order_book_orders (
              supplier_id,
              customer_id,
              delivery_date,
              status,
              subtotal,
              total
            )
            VALUES (
              standing_order_record.supplier_id,
              standing_order_record.customer_id,
              delivery_date,
              'confirmed',
              0,
              0
            )
            RETURNING id INTO order_id;
            
            -- Calculate totals
            order_total := 0;
            
            -- Loop through items in standing order
            FOR item_record IN SELECT * FROM jsonb_array_elements(standing_order_record.items)
            LOOP
              -- Get product details
              SELECT id, base_price, unit
              INTO product_record
              FROM public.order_book_products
              WHERE id = (item_record->>'product_id')::UUID
                AND supplier_id = standing_order_record.supplier_id
                AND is_active = TRUE;
              
              IF product_record.id IS NOT NULL THEN
                -- Get customer-specific pricing if exists
                SELECT custom_price
                INTO customer_pricing_record
                FROM public.order_book_customer_pricing
                WHERE customer_id = standing_order_record.customer_id
                  AND product_id = product_record.id;
                
                -- Determine price (customer-specific or base)
                IF customer_pricing_record.custom_price IS NOT NULL THEN
                  base_price := customer_pricing_record.custom_price;
                ELSE
                  base_price := product_record.base_price;
                END IF;
                
                final_price := base_price;
                
                -- Apply bulk discounts (simplified - could be enhanced)
                -- For now, just use base price
                
                -- Calculate line total
                subtotal := (item_record->>'quantity')::DECIMAL(10, 2) * final_price;
                order_total := order_total + subtotal;
                
                -- Insert order item
                INSERT INTO public.order_book_order_items (
                  order_id,
                  product_id,
                  quantity,
                  unit_price,
                  line_total
                )
                VALUES (
                  order_id,
                  product_record.id,
                  (item_record->>'quantity')::DECIMAL(10, 2),
                  final_price,
                  subtotal
                );
              END IF;
            END LOOP;
            
            -- Update order totals
            UPDATE public.order_book_orders
            SET subtotal = order_total,
                total = order_total,
                confirmed_at = NOW()
            WHERE id = order_id;
            
            generated_count := generated_count + 1;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN generated_count;
END;
$$;

