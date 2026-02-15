-- ============================================================================
-- Migration: 04-stockly-library-integration.sql
-- Description: Links Stockly stock_items to Checkly library items
-- Run this AFTER 01-stockly-foundation.sql, 02-stockly-stock-counts.sql, 03-stockly-pos-sales-gp.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD LIBRARY INTEGRATION COLUMNS TO STOCK ITEMS
-- ============================================================================

ALTER TABLE stockly.stock_items
  ADD COLUMN IF NOT EXISTS library_item_id UUID,
  ADD COLUMN IF NOT EXISTS library_type TEXT CHECK (library_type IN (
    'ingredients_library',
    'chemicals_library',
    'ppe_library',
    'drinks_library',
    'disposables_library',
    'glassware_library',
    'packaging_library',
    'serving_equipment_library'
  ));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_items_library 
  ON stockly.stock_items(library_type, library_item_id) 
  WHERE library_item_id IS NOT NULL;

-- Create index for reverse lookups (find stock items by library item)
CREATE INDEX IF NOT EXISTS idx_stock_items_library_reverse 
  ON stockly.stock_items(library_item_id) 
  WHERE library_item_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN stockly.stock_items.library_item_id IS 
  'Links to Checkly library item (ingredients_library, chemicals_library, etc.)';
COMMENT ON COLUMN stockly.stock_items.library_type IS 
  'Type of library this stock item links to';

-- ============================================================================
-- CREATE UNIFIED STOCK-LIBRARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW stockly.v_stock_items_with_library AS
SELECT 
  si.*,
  CASE si.library_type
    WHEN 'ingredients_library' THEN 
      (SELECT row_to_json(il.*) FROM ingredients_library il WHERE il.id = si.library_item_id)
    WHEN 'chemicals_library' THEN 
      (SELECT row_to_json(cl.*) FROM chemicals_library cl WHERE cl.id = si.library_item_id)
    WHEN 'ppe_library' THEN 
      (SELECT row_to_json(pl.*) FROM ppe_library pl WHERE pl.id = si.library_item_id)
    WHEN 'drinks_library' THEN 
      (SELECT row_to_json(dl.*) FROM drinks_library dl WHERE dl.id = si.library_item_id)
    WHEN 'disposables_library' THEN 
      (SELECT row_to_json(disl.*) FROM disposables_library disl WHERE disl.id = si.library_item_id)
    WHEN 'glassware_library' THEN 
      (SELECT row_to_json(gl.*) FROM glassware_library gl WHERE gl.id = si.library_item_id)
    WHEN 'packaging_library' THEN 
      (SELECT row_to_json(packl.*) FROM packaging_library packl WHERE packl.id = si.library_item_id)
    WHEN 'serving_equipment_library' THEN 
      (SELECT row_to_json(sel.*) FROM serving_equipment_library sel WHERE sel.id = si.library_item_id)
    ELSE NULL
  END AS library_data
FROM stockly.stock_items si;

-- Grant access
GRANT SELECT ON stockly.v_stock_items_with_library TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: GET LIBRARY ITEM NAME
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.get_library_item_name(
  p_library_type TEXT,
  p_library_item_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  CASE p_library_type
    WHEN 'ingredients_library' THEN
      SELECT ingredient_name INTO v_name FROM ingredients_library WHERE id = p_library_item_id;
    WHEN 'chemicals_library' THEN
      SELECT product_name INTO v_name FROM chemicals_library WHERE id = p_library_item_id;
    WHEN 'ppe_library' THEN
      SELECT item_name INTO v_name FROM ppe_library WHERE id = p_library_item_id;
    WHEN 'drinks_library' THEN
      SELECT item_name INTO v_name FROM drinks_library WHERE id = p_library_item_id;
    WHEN 'disposables_library' THEN
      SELECT item_name INTO v_name FROM disposables_library WHERE id = p_library_item_id;
    WHEN 'glassware_library' THEN
      SELECT item_name INTO v_name FROM glassware_library WHERE id = p_library_item_id;
    WHEN 'packaging_library' THEN
      SELECT item_name INTO v_name FROM packaging_library WHERE id = p_library_item_id;
    WHEN 'serving_equipment_library' THEN
      SELECT item_name INTO v_name FROM serving_equipment_library WHERE id = p_library_item_id;
    ELSE
      v_name := NULL;
  END CASE;
  
  RETURN v_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGER: SYNC LIBRARY ITEM NAME TO STOCK ITEM NAME (OPTIONAL)
-- ============================================================================

-- This trigger can be enabled if you want stock item names to auto-update
-- when library item names change. Commented out by default.

/*
CREATE OR REPLACE FUNCTION stockly.sync_library_name_to_stock_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock item name when library item name changes
  UPDATE stockly.stock_items
  SET name = stockly.get_library_item_name(TG_TABLE_NAME::TEXT, NEW.id)
  WHERE library_item_id = NEW.id
    AND library_type = TG_TABLE_NAME::TEXT;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each library table (example for ingredients_library)
CREATE TRIGGER sync_ingredients_to_stock_items
  AFTER UPDATE OF ingredient_name ON ingredients_library
  FOR EACH ROW
  WHEN (OLD.ingredient_name IS DISTINCT FROM NEW.ingredient_name)
  EXECUTE FUNCTION stockly.sync_library_name_to_stock_item();
*/

COMMIT;

SELECT 'Stockly-Checkly library integration migration completed successfully' as result;
