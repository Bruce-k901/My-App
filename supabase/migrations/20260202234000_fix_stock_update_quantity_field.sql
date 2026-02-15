-- ============================================================================
-- Migration: Fix stock update function - remove quantity field reference
-- Description: Uses quantity_ordered/quantity_received instead of quantity
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_stock_on_delivery_confirm(UUID, UUID);

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
BEGIN
  -- Get delivery info
  SELECT d.*, s.company_id as site_company_id
  INTO v_delivery
  FROM stockly.deliveries d
  JOIN public.sites s ON d.site_id = s.id
  WHERE d.id = p_delivery_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delivery not found'
    );
  END IF;

  v_company_id := COALESCE(v_delivery.company_id, v_delivery.site_company_id);

  IF v_delivery.status != 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Delivery must be confirmed before updating stock'
    );
  END IF;

  -- Process each delivery line
  FOR v_line IN
    SELECT dl.*,
           pv.stock_item_id as variant_stock_item_id,
           pv.conversion_factor as variant_conversion_factor,
           pv.current_price as variant_current_price,
           pv.id as variant_id
    FROM stockly.delivery_lines dl
    LEFT JOIN stockly.product_variants pv ON dl.product_variant_id = pv.id
    WHERE dl.delivery_id = p_delivery_id
  LOOP
    v_lines_processed := v_lines_processed + 1;

    v_stock_item_id := COALESCE(v_line.stock_item_id, v_line.variant_stock_item_id);

    IF v_stock_item_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Use quantity_received, fallback to quantity_ordered (no 'quantity' column exists)
    v_quantity := COALESCE(v_line.quantity_received, v_line.quantity_ordered, 0);

    IF v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    v_unit_cost := COALESCE(v_line.unit_price, 0);

    v_conversion_factor := COALESCE(
      v_line.variant_conversion_factor,
      NULLIF(v_line.qty_base_units, 0) / NULLIF(v_quantity, 0),
      1
    );

    v_base_qty := v_quantity * v_conversion_factor;

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

    IF v_current_avg_cost IS NOT NULL AND v_current_qty > 0 THEN
      v_new_avg_cost := ((v_current_qty * v_current_avg_cost) + (v_base_qty * v_unit_cost / NULLIF(v_conversion_factor, 0)))
                        / (v_current_qty + v_base_qty);
    ELSIF v_unit_cost > 0 THEN
      v_new_avg_cost := v_unit_cost / NULLIF(v_conversion_factor, 0);
    ELSE
      v_new_avg_cost := v_current_avg_cost;
    END IF;

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
      NULL,
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

    IF v_line.variant_id IS NOT NULL AND v_unit_cost > 0 THEN
      IF v_line.variant_current_price IS NULL OR v_line.variant_current_price != v_unit_cost THEN
        BEGIN
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
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not insert price history: %', SQLERRM;
        END;

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

GRANT EXECUTE ON FUNCTION public.update_stock_on_delivery_confirm(UUID, UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
