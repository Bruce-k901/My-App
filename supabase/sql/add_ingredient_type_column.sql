-- ============================================
-- ADD INGREDIENT_TYPE COLUMN TO INGREDIENTS_LIBRARY
-- ============================================
-- This adds a new column for smart categorization and filtering

-- Add the column
ALTER TABLE ingredients_library 
ADD COLUMN IF NOT EXISTS ingredient_type TEXT;

-- Add constraint for valid types
ALTER TABLE ingredients_library
ADD CONSTRAINT ingredient_type_check 
CHECK (ingredient_type IN ('Dry', 'Wet', 'Herb', 'Spice', 'Meat', 'Fish', 'Vegetable', 'Fruit', 'Dairy', 'Condiment', 'Other'));

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_ingredients_type ON ingredients_library(ingredient_type);

-- Update existing ingredients with types based on category
UPDATE ingredients_library SET ingredient_type = 'Vegetable' WHERE category IN ('Vegetables', 'Fresh Produce', 'Salad');
UPDATE ingredients_library SET ingredient_type = 'Fruit' WHERE category IN ('Fruit', 'Fresh Fruit');
UPDATE ingredients_library SET ingredient_type = 'Dairy' WHERE category IN ('Dairy', 'Cheese', 'Yogurt');
UPDATE ingredients_library SET ingredient_type = 'Meat' WHERE category IN ('Meat', 'Charcuterie', 'Deli Meat');
UPDATE ingredients_library SET ingredient_type = 'Fish' WHERE category IN ('Fish', 'Seafood');
UPDATE ingredients_library SET ingredient_type = 'Spice' WHERE category IN ('Spices', 'Seasonings');
UPDATE ingredients_library SET ingredient_type = 'Herb' WHERE category IN ('Herbs', 'Fresh Herbs');
UPDATE ingredients_library SET ingredient_type = 'Dry' WHERE category IN ('Dry Goods', 'Pasta', 'Rice', 'Grains', 'Baking', 'Flour', 'Sugar');
UPDATE ingredients_library SET ingredient_type = 'Wet' WHERE category IN ('Oils', 'Vinegars', 'Sauces', 'Stocks', 'Liquids');
UPDATE ingredients_library SET ingredient_type = 'Condiment' WHERE category IN ('Condiments', 'Sauces & Condiments');

-- Set remaining to 'Other' if not set
UPDATE ingredients_library SET ingredient_type = 'Other' WHERE ingredient_type IS NULL;

-- Add comment
COMMENT ON COLUMN ingredients_library.ingredient_type IS 'Type of ingredient for filtering and categorization';

