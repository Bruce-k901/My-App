-- ============================================================================
-- Migration: Fix product_variant column name issue
-- Description: Updates the create_stock_item_and_variant function to handle
--              both product_name and name column variants
-- ============================================================================

-- Drop and recreate the function to handle column name variations
CREATE OR REPLACE FUNCTION public.create_stock_item_and_variant(
  p_company_id UUID,
  p_name TEXT,
  p_stock_unit TEXT DEFAULT 'ea',
  p_supplier_id UUID DEFAULT NULL,
  p_unit_price DECIMAL DEFAULT NULL,
  p_library_type TEXT DEFAULT NULL,
  p_library_item_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock_item_id UUID;
  v_product_variant_id UUID;
  v_pack_unit_id UUID;
  v_has_product_name BOOLEAN;
BEGIN
  -- Check if stock_item already exists by name
  SELECT id INTO v_stock_item_id
  FROM stockly.stock_items
  WHERE company_id = p_company_id
    AND name = p_name
  LIMIT 1;

  -- Create stock_item if not found
  IF v_stock_item_id IS NULL THEN
    INSERT INTO stockly.stock_items (
      company_id,
      name,
      stock_unit,
      is_active,
      library_type,
      library_item_id
    ) VALUES (
      p_company_id,
      p_name,
      COALESCE(p_stock_unit, 'ea'),
      TRUE,
      p_library_type,
      p_library_item_id
    )
    RETURNING id INTO v_stock_item_id;
  END IF;

  -- If supplier_id provided, create or find product_variant
  IF p_supplier_id IS NOT NULL THEN
    -- Check if product_variant already exists
    SELECT id INTO v_product_variant_id
    FROM stockly.product_variants
    WHERE stock_item_id = v_stock_item_id
      AND supplier_id = p_supplier_id
    LIMIT 1;

    -- Create product_variant if not found
    IF v_product_variant_id IS NULL THEN
      -- Get pack_unit_id from uom table
      SELECT id INTO v_pack_unit_id
      FROM public.uom
      WHERE abbreviation = COALESCE(p_stock_unit, 'ea')
      LIMIT 1;

      -- Fallback to 'ea' if not found
      IF v_pack_unit_id IS NULL THEN
        SELECT id INTO v_pack_unit_id
        FROM public.uom
        WHERE abbreviation = 'ea'
        LIMIT 1;
      END IF;

      -- Check if product_name column exists
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly'
          AND table_name = 'product_variants'
          AND column_name = 'product_name'
      ) INTO v_has_product_name;

      IF v_has_product_name THEN
        -- Use product_name column
        INSERT INTO stockly.product_variants (
          stock_item_id,
          supplier_id,
          product_name,
          pack_size,
          pack_unit_id,
          conversion_factor,
          current_price,
          is_approved,
          is_preferred
        ) VALUES (
          v_stock_item_id,
          p_supplier_id,
          p_name,
          1,
          v_pack_unit_id,
          1,
          p_unit_price,
          TRUE,
          TRUE
        )
        RETURNING id INTO v_product_variant_id;
      ELSE
        -- Fallback: use name column if product_name doesn't exist
        INSERT INTO stockly.product_variants (
          stock_item_id,
          supplier_id,
          name,
          pack_size,
          pack_unit_id,
          conversion_factor,
          current_price,
          is_approved,
          is_preferred
        ) VALUES (
          v_stock_item_id,
          p_supplier_id,
          p_name,
          1,
          v_pack_unit_id,
          1,
          p_unit_price,
          TRUE,
          TRUE
        )
        RETURNING id INTO v_product_variant_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stock_item_id', v_stock_item_id,
    'product_variant_id', v_product_variant_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_stock_item_and_variant(UUID, TEXT, TEXT, UUID, DECIMAL, TEXT, UUID) TO authenticated;
