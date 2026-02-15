-- ============================================================================
-- Migration: Add Stock Level Updates on Delivery Confirmation
-- Description: Creates function to update stock_levels and stock_movements
--              when a delivery is confirmed
-- Updated: 2026-02-02 - Fixed to use stockly schema directly for inserts
-- ============================================================================

-- Function to update stock levels when a delivery is confirmed
CREATE OR REPLACE FUNCTION public.update_stock_on_delivery_confirm(
  p_delivery_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery RECORD;
  v_line RECORD;
  v_stock_item_id UUID;
  v_company_id UUID;
  v_quantity DECIMAL(12,4);
  v_unit_cost DECIMAL(10,4);
  v_conversion_factor DECIMAL(12,6);
  v_base_qty DECIMAL(12,4);
  v_current_qty DECIMAL(12,4);
  v_current_avg_cost DECIMAL(10,4);
  v_new_avg_cost DECIMAL(10,4);
  v_lines_processed INT := 0;
  v_movements_created INT := 0;
  v_price_history_created INT := 0;
  v_result JSONB;
BEGIN
  -- Get delivery info (try public.deliveries first, then stockly.deliveries)
  SELECT d.*, s.company_id as site_company_id
  INTO v_delivery
  FROM public.deliveries d
  JOIN public.sites s ON d.site_id = s.id
  WHERE d.id = p_delivery_id;

  IF NOT FOUND THEN
    -- Try stockly schema
    SELECT d.*, s.company_id as site_company_id
    INTO v_delivery
    FROM stockly.deliveries d
    JOIN public.sites s ON d.site_id = s.id
    WHERE d.id = p_delivery_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delivery not found'
    );
  END IF;

  -- Get company_id (from delivery or from site)
  v_company_id := COALESCE(v_delivery.company_id, v_delivery.site_company_id);

  -- Check delivery is confirmed
  IF v_delivery.status != 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delivery must be confirmed before updating stock'
    );
  END IF;

  -- Process each delivery line (try public.delivery_lines first)
  FOR v_line IN
    SELECT dl.*,
           pv.stock_item_id as variant_stock_item_id,
           pv.conversion_factor as variant_conversion_factor,
           pv.current_price as variant_current_price,
           pv.id as variant_id,
           si.costing_method
    FROM public.delivery_lines dl
    LEFT JOIN stockly.product_variants pv ON dl.product_variant_id = pv.id
    LEFT JOIN stockly.stock_items si ON COALESCE(dl.stock_item_id, pv.stock_item_id) = si.id
    WHERE dl.delivery_id = p_delivery_id
  LOOP
    v_lines_processed := v_lines_processed + 1;

    -- Determine the stock_item_id (from line directly or via product_variant)
    v_stock_item_id := COALESCE(v_line.stock_item_id, v_line.variant_stock_item_id);

    -- Skip if no stock item linked
    IF v_stock_item_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Get quantity received (default to quantity_ordered if quantity_received not set)
    v_quantity := COALESCE(v_line.quantity_received, v_line.quantity_ordered, v_line.quantity, 0);

    -- Skip if no quantity
    IF v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- Get unit cost
    v_unit_cost := COALESCE(v_line.unit_price, 0);

    -- Get conversion factor to calculate base units
    v_conversion_factor := COALESCE(
      v_line.variant_conversion_factor,
      NULLIF(v_line.qty_base_units, 0) / NULLIF(v_quantity, 0),
      1
    );

    -- Calculate base quantity (what we store in stock_levels)
    v_base_qty := v_quantity * v_conversion_factor;

    -- Get current stock level for this item at this site
    SELECT quantity, avg_cost
    INTO v_current_qty, v_current_avg_cost
    FROM stockly.stock_levels
    WHERE stock_item_id = v_stock_item_id
      AND site_id = v_delivery.site_id
      AND (storage_area_id IS NULL OR storage_area_id = '00000000-0000-0000-0000-000000000000'::uuid);

    IF NOT FOUND THEN
      v_current_qty := 0;
      v_current_avg_cost := NULL;
    END IF;

    -- Calculate new average cost (weighted average)
    IF v_line.costing_method = 'weighted_avg' AND v_current_avg_cost IS NOT NULL AND v_current_qty > 0 THEN
      -- New avg = (old_qty * old_avg + new_qty * new_cost) / (old_qty + new_qty)
      v_new_avg_cost := ((v_current_qty * v_current_avg_cost) + (v_base_qty * v_unit_cost / NULLIF(v_conversion_factor, 0)))
                        / (v_current_qty + v_base_qty);
    ELSIF v_unit_cost > 0 THEN
      -- Use last price method
      v_new_avg_cost := v_unit_cost / NULLIF(v_conversion_factor, 0);
    ELSE
      v_new_avg_cost := v_current_avg_cost;
    END IF;

    -- Create stock movement record (insert directly into stockly schema)
    INSERT INTO stockly.stock_movements (
      company_id,
      stock_item_id,
      movement_type,
      quantity,
      to_site_id,
      unit_cost,
      total_cost,
      ref_type,
      ref_id,
      notes,
      recorded_by,
      recorded_at
    ) VALUES (
      v_company_id,
      v_stock_item_id,
      'purchase',
      v_base_qty,
      v_delivery.site_id,
      COALESCE(v_unit_cost / NULLIF(v_conversion_factor, 0), 0),
      v_unit_cost * v_quantity,
      'delivery_line',
      v_line.id,
      'From delivery: ' || COALESCE(v_delivery.invoice_number, v_delivery.id::text),
      p_user_id,
      NOW()
    );

    v_movements_created := v_movements_created + 1;

    -- Upsert stock level (insert directly into stockly schema)
    INSERT INTO stockly.stock_levels (
      stock_item_id,
      site_id,
      storage_area_id,
      quantity,
      avg_cost,
      value,
      total_value,
      last_movement_at,
      updated_at
    ) VALUES (
      v_stock_item_id,
      v_delivery.site_id,
      NULL,  -- Default storage area
      v_base_qty,
      v_new_avg_cost,
      v_base_qty * COALESCE(v_new_avg_cost, 0),
      v_base_qty * COALESCE(v_new_avg_cost, 0),
      NOW(),
      NOW()
    )
    ON CONFLICT (stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      quantity = stockly.stock_levels.quantity + EXCLUDED.quantity,
      avg_cost = v_new_avg_cost,
      value = (stockly.stock_levels.quantity + EXCLUDED.quantity) * COALESCE(v_new_avg_cost, stockly.stock_levels.avg_cost, 0),
      total_value = (stockly.stock_levels.quantity + EXCLUDED.quantity) * COALESCE(v_new_avg_cost, stockly.stock_levels.avg_cost, 0),
      last_movement_at = NOW(),
      updated_at = NOW();

    -- Update product variant price and create price history if price changed
    IF v_line.variant_id IS NOT NULL AND v_unit_cost > 0 THEN
      -- Check if price changed
      IF v_line.variant_current_price IS NULL OR v_line.variant_current_price != v_unit_cost THEN
        -- Create price history record
        INSERT INTO stockly.price_history (
          product_variant_id,
          old_price,
          new_price,
          old_price_per_base,
          new_price_per_base,
          change_percent,
          source,
          source_ref,
          recorded_at,
          recorded_by
        ) VALUES (
          v_line.variant_id,
          v_line.variant_current_price,
          v_unit_cost,
          CASE WHEN v_line.variant_current_price IS NOT NULL AND v_conversion_factor > 0
               THEN v_line.variant_current_price / v_conversion_factor ELSE NULL END,
          v_unit_cost / NULLIF(v_conversion_factor, 0),
          CASE WHEN v_line.variant_current_price IS NOT NULL AND v_line.variant_current_price > 0
               THEN ((v_unit_cost - v_line.variant_current_price) / v_line.variant_current_price * 100)
               ELSE NULL END,
          'invoice',
          p_delivery_id::text,
          NOW(),
          p_user_id
        );

        v_price_history_created := v_price_history_created + 1;

        -- Update product variant price
        UPDATE stockly.product_variants
        SET current_price = v_unit_cost,
            price_per_base = v_unit_cost / NULLIF(v_conversion_factor, 0),
            price_updated_at = NOW()
        WHERE id = v_line.variant_id;
      END IF;
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'lines_processed', v_lines_processed,
    'movements_created', v_movements_created,
    'price_history_created', v_price_history_created
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_stock_on_delivery_confirm(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_stock_on_delivery_confirm IS
'Updates stock_levels, creates stock_movements, and populates price_history when a delivery is confirmed.
Call this function after setting delivery status to confirmed.
Parameters:
  - p_delivery_id: The delivery UUID
  - p_user_id: Optional user UUID for audit trail
Returns JSON with success status and counts.';

-- Also create INSTEAD OF triggers for stock_levels and stock_movements views if they exist
-- This allows the views to support INSERT operations
DO $$
BEGIN
  -- Check if stock_levels is a view
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stock_levels' AND c.relkind = 'v'
  ) THEN
    -- Create insert trigger function
    CREATE OR REPLACE FUNCTION public.insert_stock_levels()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      INSERT INTO stockly.stock_levels (
        id, stock_item_id, site_id, storage_area_id,
        quantity, avg_cost, value, total_value,
        last_movement_at, last_count_at, updated_at
      ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), NEW.stock_item_id, NEW.site_id, NEW.storage_area_id,
        NEW.quantity, NEW.avg_cost, NEW.value, NEW.total_value,
        NEW.last_movement_at, NEW.last_count_at, COALESCE(NEW.updated_at, NOW())
      )
      ON CONFLICT (stock_item_id, site_id, COALESCE(storage_area_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        avg_cost = EXCLUDED.avg_cost,
        value = EXCLUDED.value,
        total_value = EXCLUDED.total_value,
        last_movement_at = EXCLUDED.last_movement_at,
        updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS stock_levels_insert_trigger ON public.stock_levels;
    CREATE TRIGGER stock_levels_insert_trigger
      INSTEAD OF INSERT ON public.stock_levels
      FOR EACH ROW EXECUTE FUNCTION public.insert_stock_levels();
  END IF;

  -- Check if stock_movements is a view
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stock_movements' AND c.relkind = 'v'
  ) THEN
    -- Create insert trigger function
    CREATE OR REPLACE FUNCTION public.insert_stock_movements()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      INSERT INTO stockly.stock_movements (
        id, company_id, stock_item_id, movement_type, quantity,
        from_site_id, from_storage_id, to_site_id, to_storage_id,
        unit_cost, total_cost, ref_type, ref_id,
        reason, notes, photo_urls, recorded_by, recorded_at
      ) VALUES (
        COALESCE(NEW.id, gen_random_uuid()), NEW.company_id, NEW.stock_item_id, NEW.movement_type, NEW.quantity,
        NEW.from_site_id, NEW.from_storage_id, NEW.to_site_id, NEW.to_storage_id,
        NEW.unit_cost, NEW.total_cost, NEW.ref_type, NEW.ref_id,
        NEW.reason, NEW.notes, NEW.photo_urls, NEW.recorded_by, COALESCE(NEW.recorded_at, NOW())
      );
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS stock_movements_insert_trigger ON public.stock_movements;
    CREATE TRIGGER stock_movements_insert_trigger
      INSTEAD OF INSERT ON public.stock_movements
      FOR EACH ROW EXECUTE FUNCTION public.insert_stock_movements();
  END IF;
END $$;

