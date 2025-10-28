-- ============================================
-- CREATE FULL-TEXT SEARCH INDEXES
-- ============================================
-- These indexes make library searches MUCH faster
-- Uses PostgreSQL GIN indexes for full-text search

-- Ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_search ON ingredients_library 
USING gin(to_tsvector('english', 
  COALESCE(ingredient_name, '') || ' ' || 
  COALESCE(supplier, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(notes, '')
));

-- PPE
CREATE INDEX IF NOT EXISTS idx_ppe_search ON ppe_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(notes, '')
));

-- Chemicals
CREATE INDEX IF NOT EXISTS idx_chemicals_search ON chemicals_library 
USING gin(to_tsvector('english', 
  COALESCE(product_name, '') || ' ' || 
  COALESCE(manufacturer, '') || ' ' || 
  COALESCE(use_case, '') || ' ' ||
  COALESCE(notes, '')
));

-- Drinks
CREATE INDEX IF NOT EXISTS idx_drinks_search ON drinks_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(sub_category, '') || ' ' ||
  COALESCE(notes, '')
));

-- Disposables
CREATE INDEX IF NOT EXISTS idx_disposables_search ON disposables_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(usage_context, '') || ' ' ||
  COALESCE(notes, '')
));

-- Glassware
CREATE INDEX IF NOT EXISTS idx_glassware_search ON glassware_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(recommended_for, '') || ' ' ||
  COALESCE(shape_style, '') || ' ' ||
  COALESCE(notes, '')
));

-- Packaging
CREATE INDEX IF NOT EXISTS idx_packaging_search ON packaging_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(usage_context, '') || ' ' ||
  COALESCE(material, '') || ' ' ||
  COALESCE(notes, '')
));

-- Serving Equipment
CREATE INDEX IF NOT EXISTS idx_serving_equipment_search ON serving_equipment_library 
USING gin(to_tsvector('english', 
  COALESCE(item_name, '') || ' ' || 
  COALESCE(use_case, '') || ' ' ||
  COALESCE(material, '') || ' ' ||
  COALESCE(notes, '')
));

-- Equipment Library
CREATE INDEX IF NOT EXISTS idx_equipment_search ON equipment_library 
USING gin(to_tsvector('english', 
  COALESCE(equipment_name, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(sub_category, '') || ' ' ||
  COALESCE(notes, '')
));

-- Note: These indexes will be created automatically when table is accessed
-- They significantly improve search performance for large datasets

