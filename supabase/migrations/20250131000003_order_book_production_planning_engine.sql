-- ============================================================================
-- Migration: Order Book Production Planning Engine
-- Description: Core intelligence functions for auto-generating production plans,
--              calculating ingredient requirements, detecting capacity conflicts,
--              and managing standing orders
-- ============================================================================

-- ============================================================================
-- FUNCTION: generate_standing_orders()
-- ============================================================================
-- Generates orders from standing orders for the next N days
-- Called by cron job daily at 6am
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
        -- Check if order already exists
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

-- ============================================================================
-- FUNCTION: calculate_production_plan()
-- ============================================================================
-- Calculates production plan for a specific delivery date
-- Aggregates orders, calculates prep times, ingredient needs, equipment usage
CREATE OR REPLACE FUNCTION public.calculate_production_plan(
  supplier_id_param UUID,
  delivery_date_param DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  schedule_id UUID;
  total_orders INTEGER;
  total_items INTEGER;
  total_value DECIMAL(10, 2);
  order_summary RECORD;
  product_summary RECORD;
  profile_record RECORD;
  timeline_item JSONB;
  timeline_array JSONB[] := ARRAY[]::JSONB[];
  prep_date DATE;
  prep_time TIME;
  capacity_warning JSONB;
  capacity_warnings JSONB[] := ARRAY[]::JSONB[];
  equipment_usage RECORD;
  equipment_record RECORD;
  utilization_percent DECIMAL(5, 2);
BEGIN
  -- Get order summary
  SELECT 
    COUNT(DISTINCT o.id) as order_count,
    COALESCE(SUM(oi.quantity), 0)::INTEGER as item_count,
    COALESCE(SUM(o.total), 0) as value_total
  INTO order_summary
  FROM public.order_book_orders o
  LEFT JOIN public.order_book_order_items oi ON oi.order_id = o.id
  WHERE o.supplier_id = supplier_id_param
    AND o.delivery_date = delivery_date_param
    AND o.status IN ('confirmed', 'locked', 'in_production');
  
  total_orders := COALESCE(order_summary.order_count, 0);
  total_items := COALESCE(order_summary.item_count, 0);
  total_value := COALESCE(order_summary.value_total, 0);
  
  -- Get or create production schedule
  INSERT INTO public.order_book_production_schedule (
    supplier_id,
    delivery_date,
    total_orders,
    total_items,
    total_value,
    status,
    last_calculated_at
  )
  VALUES (
    supplier_id_param,
    delivery_date_param,
    total_orders,
    total_items,
    total_value,
    'draft',
    NOW()
  )
  ON CONFLICT (supplier_id, delivery_date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_items = EXCLUDED.total_items,
    total_value = EXCLUDED.total_value,
    last_calculated_at = NOW()
  RETURNING id INTO schedule_id;
  
  -- Calculate timeline (simplified - could be enhanced with actual prep/bake times)
  -- For now, create basic timeline structure
  timeline_array := ARRAY[]::JSONB[];
  
  -- Add prep stage (day before delivery)
  prep_date := delivery_date_param - INTERVAL '1 day';
  timeline_item := jsonb_build_object(
    'stage', 'prep',
    'date', prep_date::TEXT,
    'time', '14:00',
    'description', 'Preparation and mixing',
    'tasks', '[]'::JSONB
  );
  timeline_array := array_append(timeline_array, timeline_item);
  
  -- Add bake stage (early morning on delivery day)
  timeline_item := jsonb_build_object(
    'stage', 'bake',
    'date', delivery_date_param::TEXT,
    'time', '04:00',
    'description', 'Baking',
    'tasks', '[]'::JSONB
  );
  timeline_array := array_append(timeline_array, timeline_item);
  
  -- Add pack stage (morning on delivery day)
  timeline_item := jsonb_build_object(
    'stage', 'pack',
    'date', delivery_date_param::TEXT,
    'time', '09:00',
    'description', 'Packaging and dispatch',
    'tasks', '[]'::JSONB
  );
  timeline_array := array_append(timeline_array, timeline_item);
  
  -- Check equipment capacity (simplified)
  -- Loop through products with production profiles
  FOR product_summary IN
    SELECT 
      pp.product_id,
      p.name as product_name,
      SUM(oi.quantity) as total_quantity,
      pp.equipment_requirements
    FROM public.order_book_production_profiles pp
    JOIN public.order_book_products p ON p.id = pp.product_id
    JOIN public.order_book_order_items oi ON oi.product_id = pp.product_id
    JOIN public.order_book_orders o ON o.id = oi.order_id
    WHERE o.supplier_id = supplier_id_param
      AND o.delivery_date = delivery_date_param
      AND o.status IN ('confirmed', 'locked', 'in_production')
    GROUP BY pp.product_id, p.name, pp.equipment_requirements
  LOOP
    -- Parse equipment requirements (simplified - would need proper JSONB parsing)
    -- For now, skip detailed capacity checks
    -- In production, this would:
    -- 1. Parse equipment_requirements JSONB
    -- 2. Sum up equipment usage
    -- 3. Compare against equipment capacity
    -- 4. Generate warnings if over capacity
  END LOOP;
  
  -- Update schedule with timeline (convert array to JSONB)
  UPDATE public.order_book_production_schedule
  SET 
    timeline = CASE 
      WHEN array_length(timeline_array, 1) IS NULL THEN '[]'::JSONB
      ELSE (SELECT jsonb_agg(elem) FROM unnest(timeline_array) AS elem)
    END,
    capacity_warnings = CASE 
      WHEN array_length(capacity_warnings, 1) IS NULL THEN '[]'::JSONB
      ELSE (SELECT jsonb_agg(elem) FROM unnest(capacity_warnings) AS elem)
    END,
    status = 'confirmed'
  WHERE id = schedule_id;
  
  RETURN schedule_id;
END;
$$;

-- ============================================================================
-- FUNCTION: calculate_ingredient_pulls()
-- ============================================================================
-- Calculates ingredient requirements for a delivery date
CREATE OR REPLACE FUNCTION public.calculate_ingredient_pulls(
  supplier_id_param UUID,
  delivery_date_param DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  pull_id UUID;
  prep_date DATE;
  ingredient_summary RECORD;
  ingredient_item JSONB;
  ingredient_array JSONB[] := ARRAY[]::JSONB[];
  total_quantity DECIMAL(10, 4);
BEGIN
  -- Prep date is typically day before delivery
  prep_date := delivery_date_param - INTERVAL '1 day';
  
  -- Aggregate ingredient requirements from all orders
  FOR ingredient_summary IN
    SELECT 
      pc.ingredient_name,
      pc.unit,
      SUM(oi.quantity * pc.quantity_per_unit) as total_quantity
    FROM public.order_book_order_items oi
    JOIN public.order_book_orders o ON o.id = oi.order_id
    JOIN public.order_book_production_profiles pp ON pp.product_id = oi.product_id
    JOIN public.order_book_product_components pc ON pc.production_profile_id = pp.id
    WHERE o.supplier_id = supplier_id_param
      AND o.delivery_date = delivery_date_param
      AND o.status IN ('confirmed', 'locked', 'in_production')
    GROUP BY pc.ingredient_name, pc.unit
  LOOP
    ingredient_item := jsonb_build_object(
      'ingredient_name', ingredient_summary.ingredient_name,
      'quantity', ingredient_summary.total_quantity,
      'unit', ingredient_summary.unit,
      'in_stock', true, -- Simplified - would check actual stock levels
      'stock_level', NULL,
      'warning', NULL
    );
    
    ingredient_array := array_append(ingredient_array, ingredient_item);
  END LOOP;
  
  -- Insert or update ingredient pull (convert array to JSONB)
  INSERT INTO public.order_book_ingredient_pulls (
    supplier_id,
    delivery_date,
    prep_date,
    ingredients
  )
  VALUES (
    supplier_id_param,
    delivery_date_param,
    prep_date,
    CASE 
      WHEN array_length(ingredient_array, 1) IS NULL THEN '[]'::JSONB
      ELSE (SELECT jsonb_agg(elem) FROM unnest(ingredient_array) AS elem)
    END
  )
  ON CONFLICT (supplier_id, delivery_date, prep_date)
  DO UPDATE SET
    ingredients = EXCLUDED.ingredients,
    updated_at = NOW()
  RETURNING id INTO pull_id;
  
  RETURN pull_id;
END;
$$;

-- ============================================================================
-- FUNCTION: get_production_summary()
-- ============================================================================
-- Gets production summary for a supplier and date range
CREATE OR REPLACE FUNCTION public.get_production_summary(
  supplier_id_param UUID,
  date_from DATE,
  date_to DATE
)
RETURNS TABLE (
  delivery_date DATE,
  total_orders INTEGER,
  total_items INTEGER,
  total_value DECIMAL(10, 2),
  status TEXT,
  has_conflicts BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.delivery_date,
    ps.total_orders,
    ps.total_items,
    ps.total_value,
    ps.status,
    (jsonb_array_length(ps.capacity_warnings) > 0) as has_conflicts
  FROM public.order_book_production_schedule ps
  WHERE ps.supplier_id = supplier_id_param
    AND ps.delivery_date BETWEEN date_from AND date_to
  ORDER BY ps.delivery_date;
END;
$$;

-- ============================================================================
-- FUNCTION: refresh_production_plans()
-- ============================================================================
-- Refreshes production plans for all suppliers for next 7 days
-- Can be called by cron job or triggered after order changes
CREATE OR REPLACE FUNCTION public.refresh_production_plans()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  refreshed_count INTEGER := 0;
  supplier_record RECORD;
  delivery_date DATE;
  plan_id UUID;
  pull_id UUID;
BEGIN
  -- Loop through all active suppliers
  FOR supplier_record IN
    SELECT id FROM public.order_book_suppliers
    WHERE is_active = TRUE
  LOOP
    -- Loop through next 7 days
    FOR delivery_date IN
      SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 6, '1 day'::interval)::DATE
    LOOP
      -- Calculate production plan
      plan_id := public.calculate_production_plan(supplier_record.id, delivery_date);
      
      -- Calculate ingredient pulls
      pull_id := public.calculate_ingredient_pulls(supplier_record.id, delivery_date);
      
      refreshed_count := refreshed_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN refreshed_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_standing_orders(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_production_plan(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_ingredient_pulls(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_production_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_production_plans() TO authenticated;

