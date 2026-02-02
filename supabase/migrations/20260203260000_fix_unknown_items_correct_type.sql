-- ============================================================================
-- Migration: Fix Unknown Item names - using correct library_type value
-- Description: The library_type is 'ingredients_library' (the table name), not 'ingredient'
-- ============================================================================

-- Fix Unknown Item stock items with proper names from ingredients_library
UPDATE stockly.stock_items si
SET name = il.ingredient_name
FROM public.ingredients_library il
WHERE si.library_item_id = il.id
  AND si.library_type = 'ingredients_library'
  AND (si.name = 'Unknown Item' OR si.name IS NULL OR si.name = '');

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
