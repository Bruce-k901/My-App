-- ============================================================================
-- Migration: Order Book Helper Functions
-- Description: Utility functions for order number generation, distance calculations,
--              delivery radius checks, and order locking
-- ============================================================================

-- This migration only runs if order_book_orders table exists
DO $$
BEGIN
  -- Check if order_book_orders table exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_orders'
  ) THEN
    RAISE NOTICE 'order_book_orders table does not exist - skipping order_book_helper_functions migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'order_book_orders table found - proceeding with order_book_helper_functions migration';
END $$;

-- Only proceed if order_book_orders table exists (checked above)
DO $$
BEGIN
  -- Check if order_book_orders table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_orders'
  ) THEN
    RETURN;
  END IF;

  -- ============================================================================
  -- FUNCTION: generate_order_number()
  -- ============================================================================
  -- Generates unique order number: OB-YYYYMMDD-001
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION public.generate_order_number(supplier_id_param UUID)
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $func$
    DECLARE
  today_prefix TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  -- Format: OB-YYYYMMDD
  today_prefix := 'OB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
  
  -- Find the highest number for today
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
  
    RETURN new_number;
  END;
  $func$;
  $sql1$;

  -- ============================================================================
  -- FUNCTION: calculate_distance_km()
  -- ============================================================================
  -- Calculates distance between two lat/lng points using Haversine formula
  -- Returns distance in kilometers
  EXECUTE $sql2$
    CREATE OR REPLACE FUNCTION public.calculate_distance_km(
      lat1 DECIMAL,
      lng1 DECIMAL,
      lat2 DECIMAL,
      lng2 DECIMAL
    )
    RETURNS DECIMAL
    LANGUAGE plpgsql
    IMMUTABLE
    AS $func$
    DECLARE
  earth_radius_km DECIMAL := 6371.0;
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  
  -- Haversine formula
  a := SIN(dlat / 2) * SIN(dlat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlng / 2) * SIN(dlng / 2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
    RETURN earth_radius_km * c;
  END;
  $func$;
  $sql2$;

  -- ============================================================================
  -- FUNCTION: is_within_delivery_radius()
  -- ============================================================================
  -- Checks if customer location is within supplier's delivery radius
  EXECUTE $sql3$
    CREATE OR REPLACE FUNCTION public.is_within_delivery_radius(
      supplier_id_param UUID,
      customer_lat DECIMAL,
      customer_lng DECIMAL
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    AS $func$
    DECLARE
  supplier_record RECORD;
  distance_km DECIMAL;
BEGIN
  -- Get supplier location and radius
  SELECT latitude, longitude, delivery_radius_km
  INTO supplier_record
  FROM public.order_book_suppliers
  WHERE id = supplier_id_param
    AND is_active = TRUE;
  
  -- If supplier location not set, allow (for testing)
  IF supplier_record.latitude IS NULL OR supplier_record.longitude IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If customer location not set, deny
  IF customer_lat IS NULL OR customer_lng IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate distance
  distance_km := public.calculate_distance_km(
    supplier_record.latitude,
    supplier_record.longitude,
    customer_lat,
    customer_lng
  );
  
    -- Check if within radius
    RETURN distance_km <= supplier_record.delivery_radius_km;
  END;
  $func$;
  $sql3$;

  -- ============================================================================
  -- FUNCTION: generate_invoice_number()
  -- ============================================================================
  -- Generates unique invoice number: INV-YYYYMMDD-001
  EXECUTE $sql4$
    CREATE OR REPLACE FUNCTION public.generate_invoice_number(supplier_id_param UUID)
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $func$
    DECLARE
  today_prefix TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  -- Format: INV-YYYYMMDD
  today_prefix := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
  
  -- Find the highest number for today
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(
          invoice_number 
          FROM LENGTH(today_prefix) + 1 
          FOR 3
        ) AS INTEGER
      )
    ), 
    0
  )
  INTO last_number
  FROM public.order_book_invoices
  WHERE supplier_id = supplier_id_param
    AND invoice_number LIKE today_prefix || '%';
  
    -- Increment and format with leading zeros
    new_number := today_prefix || LPAD((last_number + 1)::TEXT, 3, '0');
    
    RETURN new_number;
  END;
  $func$;
  $sql4$;

  -- ============================================================================
  -- FUNCTION: lock_orders_past_cutoff()
  -- ============================================================================
  -- Locks orders that are past the cutoff time (prevents customer edits)
  EXECUTE $sql5$
    CREATE OR REPLACE FUNCTION public.lock_orders_past_cutoff()
    RETURNS INTEGER
    LANGUAGE plpgsql
    AS $func$
    DECLARE
  locked_count INTEGER := 0;
  order_record RECORD;
  cutoff_time_val TIME;
  cutoff_days_val INTEGER;
  cutoff_datetime TIMESTAMPTZ;
BEGIN
  -- Loop through all suppliers
  FOR order_record IN
    SELECT DISTINCT o.id, o.supplier_id, o.delivery_date, o.status
    FROM public.order_book_orders o
    JOIN public.order_book_suppliers s ON s.id = o.supplier_id
    WHERE o.status IN ('draft', 'confirmed')
      AND o.locked_at IS NULL
      AND o.delivery_date >= CURRENT_DATE
  LOOP
    -- Get supplier's cutoff time and days
    SELECT COALESCE(order_cutoff_time, '14:00'::TIME), COALESCE(order_cutoff_days, 1)
    INTO cutoff_time_val, cutoff_days_val
    FROM public.order_book_suppliers
    WHERE id = order_record.supplier_id;
    
    -- Calculate cutoff datetime
    cutoff_datetime := (order_record.delivery_date - MAKE_INTERVAL(days => cutoff_days_val))::DATE 
                       + cutoff_time_val;
    
    -- If current time is past cutoff, lock the order
    IF NOW() >= cutoff_datetime THEN
      UPDATE public.order_book_orders
      SET 
        locked_at = NOW(),
        status = CASE 
          WHEN status = 'draft' THEN 'confirmed'
          ELSE status
        END
      WHERE id = order_record.id;
      
      locked_count := locked_count + 1;
    END IF;
  END LOOP;
  
    RETURN locked_count;
  END;
  $func$;
  $sql5$;

  -- ============================================================================
  -- TRIGGER: Auto-generate order_number on INSERT
  -- ============================================================================
  EXECUTE $sql6$
    CREATE OR REPLACE FUNCTION public.order_book_orders_set_order_number()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
  -- Only set if not already provided
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number(NEW.supplier_id);
  END IF;
  
    RETURN NEW;
  END;
  $func$;
  $sql6$;

  DROP TRIGGER IF EXISTS order_book_orders_set_order_number_trigger ON public.order_book_orders;
  CREATE TRIGGER order_book_orders_set_order_number_trigger
    BEFORE INSERT ON public.order_book_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.order_book_orders_set_order_number();

  -- ============================================================================
  -- TRIGGER: Auto-generate invoice_number on INSERT
  -- ============================================================================
  -- Only create invoice trigger if order_book_invoices table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'order_book_invoices'
  ) THEN
    EXECUTE $sql7$
      CREATE OR REPLACE FUNCTION public.order_book_invoices_set_invoice_number()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $func$
      BEGIN
  -- Only set if not already provided
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_invoice_number(NEW.supplier_id);
  END IF;
  
      RETURN NEW;
    END;
    $func$;
    $sql7$;

    DROP TRIGGER IF EXISTS order_book_invoices_set_invoice_number_trigger ON public.order_book_invoices;
    CREATE TRIGGER order_book_invoices_set_invoice_number_trigger
      BEFORE INSERT ON public.order_book_invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.order_book_invoices_set_invoice_number();
  END IF;

END $$;

