-- ============================================================================
-- Migration: Fix Unknown Item names and link missing stock items
-- Description: Updates stock_items with names from ingredients_library and
--              links unlinked product variants
-- ============================================================================

-- Fix 1: Update "Unknown Item" stock items with proper names from ingredients_library
-- Note: ingredients_library is in public schema with column ingredient_name
UPDATE stockly.stock_items si
SET name = il.ingredient_name
FROM public.ingredients_library il
WHERE si.library_item_id = il.id
  AND si.library_type = 'ingredient'
  AND (si.name = 'Unknown Item' OR si.name IS NULL OR si.name = '');

-- Fix 2: Link product_variants to stock_items where stock_item_id is NULL
-- but we can match via supplier_description to ingredients_library
UPDATE stockly.product_variants pv
SET stock_item_id = si.id
FROM public.ingredients_library il
JOIN stockly.stock_items si ON si.library_item_id = il.id AND si.library_type = 'ingredient'
WHERE pv.stock_item_id IS NULL
  AND (
    LOWER(TRIM(pv.supplier_description)) = LOWER(TRIM(il.ingredient_name))
    OR LOWER(TRIM(pv.product_name)) = LOWER(TRIM(il.ingredient_name))
  );

-- Fix 3: Also update any stock_items that have library_item_id but no name
-- Only check ingredients_library (safe approach)
UPDATE stockly.stock_items si
SET name = il.ingredient_name
FROM public.ingredients_library il
WHERE si.library_item_id = il.id
  AND si.library_type = 'ingredient'
  AND (si.name IS NULL OR si.name = '' OR si.name = 'Unknown Item');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
