-- ============================================================
-- Cleanup: Deactivate wrongly-linked product_variants on First Mile
-- ============================================================
-- First Mile should only have: Recycling bin bags, General waste bin bags
-- Any other variants were incorrectly assigned.
-- ============================================================

DO $$
DECLARE
  v_supplier_id UUID;
  v_total INT;
  v_deactivated INT;
BEGIN
  -- Find First Mile supplier
  SELECT id INTO v_supplier_id
  FROM stockly.suppliers
  WHERE name ILIKE '%first mile%'
    AND is_active = true
  LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE NOTICE 'No active "First Mile" supplier found — nothing to do.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found First Mile supplier: %', v_supplier_id;

  -- Count total active variants
  SELECT COUNT(*) INTO v_total
  FROM stockly.product_variants
  WHERE supplier_id = v_supplier_id AND is_active = true;

  RAISE NOTICE 'Total active product_variants on First Mile: %', v_total;

  -- Deactivate variants that are NOT bin bags
  -- Keep only items whose stock_item name matches bin bags / waste bags
  UPDATE stockly.product_variants pv
  SET is_active = false, updated_at = NOW()
  WHERE pv.supplier_id = v_supplier_id
    AND pv.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM stockly.stock_items si
      WHERE si.id = pv.stock_item_id
        AND (
          si.name ILIKE '%bin bag%'
          OR si.name ILIKE '%refuse%'
          OR si.name ILIKE '%waste bag%'
          OR si.name ILIKE '%cardboard tape%'
        )
    );

  GET DIAGNOSTICS v_deactivated = ROW_COUNT;
  RAISE NOTICE 'Deactivated % incorrect variant(s). Kept % correct variant(s).', v_deactivated, v_total - v_deactivated;
END $$;
