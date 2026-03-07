-- ============================================================================
-- Migration: 20250231000001_add_allergens_to_stock_items.sql
-- Description: Adds allergens column to stock_items table if it doesn't exist
-- Allergens are critical for hospitality industry compliance (EU FIC, UK food law)
-- Note: public.stock_items is a VIEW, so we only add to the underlying table stockly.stock_items
-- ============================================================================

DO $$
BEGIN
  -- Add to stockly.stock_items (the underlying table - the view will reflect this change)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_items' 
      AND column_name = 'allergens'
    ) THEN
      ALTER TABLE stockly.stock_items 
      ADD COLUMN allergens TEXT[] DEFAULT NULL;
      
      COMMENT ON COLUMN stockly.stock_items.allergens IS 'Array of allergen names for UK/EU food labelling compliance (celery, gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, nuts, peanuts, sesame, soybeans, sulphites)';
    END IF;
  END IF;
  
  -- Also check public.stock_items if it's a table (not a view)
  -- If it's a view, it will automatically reflect the change from stockly.stock_items
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_items'
    AND table_type = 'BASE TABLE'  -- Only proceed if it's a table, not a view
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_items' 
      AND column_name = 'allergens'
    ) THEN
      ALTER TABLE public.stock_items 
      ADD COLUMN allergens TEXT[] DEFAULT NULL;
      
      COMMENT ON COLUMN public.stock_items.allergens IS 'Array of allergen names for UK/EU food labelling compliance';
    END IF;
  END IF;
END $$;

-- Notify PostgREST to reload schema cache so it recognizes the new column
NOTIFY pgrst, 'reload schema';

