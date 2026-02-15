-- ============================================================================
-- Migration: Seed Default Stock Categories
-- Description: Function to seed default stock categories for companies
-- ============================================================================

BEGIN;

-- Function to seed default stock categories for a company
CREATE OR REPLACE FUNCTION seed_stock_categories_for_company(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if company has no categories yet
  IF EXISTS (SELECT 1 FROM stock_categories WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  INSERT INTO stock_categories (company_id, name, category_type, sort_order) VALUES
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
$$ LANGUAGE plpgsql;

COMMIT;










