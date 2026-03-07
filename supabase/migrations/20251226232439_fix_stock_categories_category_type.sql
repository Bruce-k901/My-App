-- Fix stock_categories table to ensure category_type column exists
-- Note: public.stock_categories is a VIEW, the actual table is stockly.stock_categories
-- and update the seed function accordingly

BEGIN;

-- Check if category_type column exists in the underlying table, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_categories' 
    AND column_name = 'category_type'
  ) THEN
    -- Add the category_type column to the underlying table
    ALTER TABLE stockly.stock_categories
    ADD COLUMN category_type TEXT CHECK (category_type IN (
      'food', 'beverage', 'alcohol', 'chemical', 'disposable', 'equipment', 'other'
    ));
    
    -- Update existing rows with a default value based on name (if possible)
    -- This is a best-effort approach for existing data
    UPDATE stockly.stock_categories
    SET category_type = CASE
      WHEN LOWER(name) LIKE '%meat%' OR LOWER(name) LIKE '%poultry%' OR 
           LOWER(name) LIKE '%fish%' OR LOWER(name) LIKE '%seafood%' OR
           LOWER(name) LIKE '%dairy%' OR LOWER(name) LIKE '%egg%' OR
           LOWER(name) LIKE '%vegetable%' OR LOWER(name) LIKE '%fruit%' OR
           LOWER(name) LIKE '%bread%' OR LOWER(name) LIKE '%bakery%' OR
           LOWER(name) LIKE '%pasta%' OR LOWER(name) LIKE '%herb%' OR
           LOWER(name) LIKE '%spice%' OR LOWER(name) LIKE '%oil%' OR
           LOWER(name) LIKE '%condiment%' OR LOWER(name) LIKE '%prepared%' OR
           LOWER(name) LIKE '%deli%' OR LOWER(name) LIKE '%frozen%'
      THEN 'food'
      WHEN LOWER(name) LIKE '%drink%' OR LOWER(name) LIKE '%beer%' OR
           LOWER(name) LIKE '%cider%' OR LOWER(name) LIKE '%wine%' OR
           LOWER(name) LIKE '%spirit%' OR LOWER(name) LIKE '%coffee%' OR
           LOWER(name) LIKE '%tea%' OR LOWER(name) LIKE '%juice%' OR
           LOWER(name) LIKE '%mixer%'
      THEN 'beverage'
      WHEN LOWER(name) LIKE '%packaging%' OR LOWER(name) LIKE '%takeaway%' OR
           LOWER(name) LIKE '%napkin%' OR LOWER(name) LIKE '%paper%' OR
           LOWER(name) LIKE '%glove%' OR LOWER(name) LIKE '%ppe%'
      THEN 'disposable'
      WHEN LOWER(name) LIKE '%clean%' OR LOWER(name) LIKE '%sanitis%' OR
           LOWER(name) LIKE '%chemical%'
      THEN 'chemical'
      ELSE 'other'
    END
    WHERE category_type IS NULL;
    
    -- Set NOT NULL constraint if all rows have values
    -- But first make sure no NULLs remain
    UPDATE stockly.stock_categories SET category_type = 'other' WHERE category_type IS NULL;
    ALTER TABLE stockly.stock_categories ALTER COLUMN category_type SET NOT NULL;
    
    RAISE NOTICE 'Added category_type column to stockly.stock_categories table';
  ELSE
    RAISE NOTICE 'category_type column already exists in stockly.stock_categories table';
  END IF;
END $$;

-- Now update the seed function to ensure it works correctly
CREATE OR REPLACE FUNCTION seed_stock_categories_for_company(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to company %', p_company_id
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- Only seed if company has no categories yet (check underlying table)
  IF EXISTS (SELECT 1 FROM stockly.stock_categories WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  INSERT INTO stockly.stock_categories (company_id, name, category_type, sort_order) VALUES
    -- Food categories
    (p_company_id, 'Meat & Poultry', 'food', 1),
    (p_company_id, 'Fish & Seafood', 'food', 2),
    (p_company_id, 'Dairy & Eggs', 'food', 3),
    (p_company_id, 'Vegetables', 'food', 4),
    (p_company_id, 'Fruit', 'food', 5),
    (p_company_id, 'Dry Goods & Pasta', 'food', 6),
    (p_company_id, 'Bakery & Bread', 'food', 7),
    (p_company_id, 'Frozen', 'food', 8),
    (p_company_id, 'Oils & Condiments', 'food', 9),
    (p_company_id, 'Herbs & Spices', 'food', 10),
    (p_company_id, 'Prepared & Deli', 'food', 11),
    
    -- Beverage categories
    (p_company_id, 'Soft Drinks', 'beverage', 20),
    (p_company_id, 'Beer & Cider', 'beverage', 21),
    (p_company_id, 'Wine', 'beverage', 22),
    (p_company_id, 'Spirits', 'beverage', 23),
    (p_company_id, 'Coffee & Tea', 'beverage', 24),
    (p_company_id, 'Mixers & Juices', 'beverage', 25),
    
    -- Disposables
    (p_company_id, 'Packaging & Takeaway', 'disposable', 30),
    (p_company_id, 'Napkins & Paper', 'disposable', 31),
    (p_company_id, 'Gloves & PPE', 'disposable', 32),
    
    -- Chemicals
    (p_company_id, 'Cleaning Chemicals', 'chemical', 40),
    (p_company_id, 'Sanitisers', 'chemical', 41);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION seed_stock_categories_for_company(UUID) TO authenticated;

COMMIT;

