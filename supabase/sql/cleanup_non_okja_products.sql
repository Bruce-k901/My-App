-- ============================================================================
-- Cleanup Script: Remove products not in Okja product list
-- Description: Deletes products from order_book_products that aren't in the Okja list
-- Run this in Supabase SQL Editor after running the sample data migration
-- ============================================================================

-- List of Okja products (matching the migration)
DO $$
DECLARE
  okja_supplier_id UUID;
  okja_product_names TEXT[] := ARRAY[
    -- Pastries
    'Croissant',
    'Morning Bun',
    'Pan a Choc',
    'Almond Croissant',
    'Red Pesto Bun',
    'Chives Bun',
    'Garlic Bun',
    'Pistachio Swirl',
    'Choc Hazel Swirl',
    'Cina Swirl',
    'Lemon Poppy',
    'Mince Pie',
    'Monkey Bread',
    'Sausage Skrol',
    -- Cookies
    'Almond Cookie',
    'Choc Hazelnut',
    'Choc Pecan',
    'Choc Cookie',
    'Oatmeal Raisin',
    'Gingerbread Man'
  ];
BEGIN
  -- Find Okja supplier ID
  SELECT id INTO okja_supplier_id 
  FROM public.order_book_suppliers 
  WHERE business_name = 'Okja Bakery' 
  LIMIT 1;

  IF okja_supplier_id IS NULL THEN
    RAISE NOTICE '⚠️ Okja Bakery supplier not found';
    RETURN;
  END IF;

  RAISE NOTICE '🔍 Found Okja supplier: %', okja_supplier_id;

  -- Delete products that aren't in the Okja list
  DELETE FROM public.order_book_products
  WHERE supplier_id = okja_supplier_id
    AND name NOT IN (SELECT unnest(okja_product_names));

  RAISE NOTICE '✅ Cleanup complete - Only Okja products remain';
END $$;

-- Verify cleanup
SELECT 
  'Products remaining: ' || COUNT(*)::TEXT as result
FROM public.order_book_products p
JOIN public.order_book_suppliers s ON s.id = p.supplier_id
WHERE s.business_name = 'Okja Bakery';

-- List all products
SELECT 
  p.name,
  p.category,
  p.base_price,
  p.unit,
  p.is_active
FROM public.order_book_products p
JOIN public.order_book_suppliers s ON s.id = p.supplier_id
WHERE s.business_name = 'Okja Bakery'
ORDER BY p.category, p.name;

