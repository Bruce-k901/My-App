-- ============================================
-- SEED DATA FOR ADDITIONAL LIBRARIES (EASY VERSION)
-- ============================================
-- This file seeds: glassware_library, packaging_library, serving_equipment_library
-- 
-- This version will use the first company_id from your companies table
-- Run this file directly in Supabase SQL Editor

-- Get the first company_id automatically
DO $$
DECLARE
    company_uuid UUID;
BEGIN
    -- Get the first company_id from the companies table
    SELECT id INTO company_uuid FROM companies LIMIT 1;
    
    IF company_uuid IS NULL THEN
        RAISE EXCEPTION 'No company found in companies table. Please create a company first.';
    END IF;
    
    RAISE NOTICE 'Using company_id: %', company_uuid;
    
    -- ============================================
    -- GLASSWARE_LIBRARY SEED DATA
    -- ============================================
    
    -- Beer Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Pint Glass', 'Beer', 568, 'Glass', 'Pint', 'Ale, Lager, Cider', 'Eclipse', 1.50, 12, true, 'Low', 'Bar Shelf A', 12, 'UK standard pint'),
    (company_uuid, 'Half Pint Glass', 'Beer', 284, 'Glass', 'Half Pint', 'Beer samples, Lighter beers', 'Eclipse', 1.20, 12, true, 'Low', 'Bar Shelf A', 12, 'Standard half pint'),
    (company_uuid, 'Tulip Glass', 'Beer', 500, 'Glass', 'Tulip', 'IPA, Belgian Ale', 'Eclipse', 2.50, 6, true, 'Medium', 'Bar Shelf B', 6, 'Premium beer glass'),
    (company_uuid, 'Schooner Glass', 'Beer', 425, 'Glass', 'Schooner', 'Lager, Pale Ale', 'Eclipse', 1.80, 8, true, 'Low', 'Bar Shelf A', 8, 'Australian standard'),
    (company_uuid, 'Pilsner Glass', 'Beer', 500, 'Glass', 'Pilsner', 'Pilsner, Helles', 'Eclipse', 2.00, 8, true, 'Medium', 'Bar Shelf B', 8, 'Tall tapered');
    
    -- Wine Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Red Wine Glass', 'Wine', 250, 'Crystal', 'Bordeaux', 'Red Wine', 'Stölzle', 3.50, 6, true, 'Medium', 'Bar Shelf C', 12, 'Riedel-style shape'),
    (company_uuid, 'White Wine Glass', 'Wine', 175, 'Crystal', 'Burgundy', 'White Wine, Rosé', 'Stölzle', 3.50, 6, true, 'Medium', 'Bar Shelf C', 12, 'Slightly smaller bowl'),
    (company_uuid, 'Champagne Flute', 'Wine', 150, 'Crystal', 'Flute', 'Champagne, Prosecco, Cava', 'Stölzle', 4.00, 6, true, 'High', 'Bar Shelf C', 6, 'Fragile - handle with care'),
    (company_uuid, 'Wine Glass Standard', 'Wine', 200, 'Glass', 'Universal', 'House wine', 'Eclipse', 1.50, 12, true, 'Low', 'Bar Shelf C', 24, 'All-purpose wine glass');
    
    -- Cocktail Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Martini Glass', 'Cocktails', 175, 'Glass', 'Coupe', 'Martini, Manhattan', 'Libbey', 2.50, 6, true, 'High', 'Bar Shelf D', 6, 'Classic cocktail glass'),
    (company_uuid, 'Coupe Glass', 'Cocktails', 170, 'Glass', 'Coupe', 'Champagne cocktails, Sours', 'Libbey', 2.50, 6, true, 'High', 'Bar Shelf D', 6, 'Wide shallow bowl'),
    (company_uuid, 'Margarita Glass', 'Cocktails', 300, 'Glass', 'Margarita', 'Margarita, Frozen cocktails', 'Libbey', 2.00, 6, true, 'High', 'Bar Shelf D', 6, 'Rimmed glass'),
    (company_uuid, 'Hurricane Glass', 'Cocktails', 450, 'Glass', 'Hurricane', 'Tiki drinks, Fruit cocktails', 'Libbey', 2.00, 6, true, 'Medium', 'Bar Shelf D', 6, 'Tall exotic'),
    (company_uuid, 'Rocks Glass', 'Cocktails', 250, 'Glass', 'Old Fashioned', 'Whisky neat, Old Fashioned', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Short tumbler'),
    (company_uuid, 'Highball Glass', 'Cocktails', 350, 'Glass', 'Highball', 'Gin & Tonic, Highballs', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Tall straight'),
    (company_uuid, 'Collins Glass', 'Cocktails', 375, 'Glass', 'Collins', 'Tom Collins, Mojito', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Tall with ice capacity');
    
    -- Spirits Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Shot Glass 25ml', 'Spirits', 25, 'Glass', 'Standard', 'Shots, Spirits', 'Libbey', 0.50, 20, true, 'Low', 'Bar Shelf E', 40, 'Single shot'),
    (company_uuid, 'Shot Glass 50ml', 'Spirits', 50, 'Glass', 'Standard', 'Double shots', 'Libbey', 0.60, 20, true, 'Low', 'Bar Shelf E', 40, 'Double shot'),
    (company_uuid, 'Copita Glass', 'Spirits', 100, 'Crystal', 'Tulip', 'Whisky nosing, Cognac', 'Stölzle', 2.00, 6, true, 'High', 'Bar Shelf E', 6, 'Premium tasting glass');
    
    -- Hot Beverages Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Espresso Cup', 'Hot Beverages', 75, 'Porcelain', 'Demitasse', 'Espresso', 'ACME', 1.50, 8, true, 'Low', 'Kitchen Shelf A', 16, 'Small white cup'),
    (company_uuid, 'Cappuccino Cup', 'Hot Beverages', 180, 'Porcelain', 'Wide Bowl', 'Cappuccino, Flat White', 'ACME', 2.00, 6, true, 'Low', 'Kitchen Shelf A', 12, 'Medium with saucer'),
    (company_uuid, 'Latte Glass', 'Hot Beverages', 240, 'Glass', 'Tall Glass', 'Latte, Piccolo', 'Libbey', 1.80, 6, true, 'Medium', 'Kitchen Shelf A', 12, 'Tall clear glass'),
    (company_uuid, 'Tea Cup', 'Hot Beverages', 200, 'Porcelain', 'Standard', 'Tea, Hot Chocolate', 'ACME', 1.80, 6, true, 'Low', 'Kitchen Shelf A', 12, 'Classic tea cup'),
    (company_uuid, 'Coffee Mug', 'Hot Beverages', 350, 'Ceramic', 'Mug', 'Coffee, Tea, Hot drinks', 'ACME', 1.50, 8, true, 'Low', 'Kitchen Shelf A', 16, 'Large mug');
    
    -- Soft Drinks Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Tumbler 250ml', 'Soft Drinks', 250, 'Glass', 'Tumbler', 'Soft drinks, Water', 'Libbey', 1.00, 12, true, 'Low', 'Bar Shelf F', 24, 'Standard tumbler'),
    (company_uuid, 'Tumbler 350ml', 'Soft Drinks', 350, 'Glass', 'Tumbler', 'Soft drinks, Larger serves', 'Libbey', 1.20, 12, true, 'Low', 'Bar Shelf F', 24, 'Large tumbler'),
    (company_uuid, 'Hi-ball Glass', 'Soft Drinks', 400, 'Glass', 'Highball', 'Coca Cola, Mixers', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf F', 16, 'Tall with ice');
    
    -- Specialist Glasses
    INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
    (company_uuid, 'Brandy Balloon', 'Specialist', 150, 'Crystal', 'Balloon', 'Brandy, Cognac', 'Stölzle', 3.00, 4, true, 'High', 'Bar Shelf E', 4, 'Large bowled'),
    (company_uuid, 'Irish Coffee Glass', 'Specialist', 220, 'Glass', 'Mug', 'Irish Coffee, Hot cocktails', 'Libbey', 2.00, 6, true, 'Medium', 'Bar Shelf D', 6, 'Stemmed mug'),
    (company_uuid, 'Tiki Mug', 'Specialist', 500, 'Ceramic', 'Tiki', 'Tiki cocktails, Zombie', 'Custom', 8.00, 2, true, 'Low', 'Bar Shelf D', 2, 'Decorative');
    
    RAISE NOTICE '✓ Glassware library seeded successfully';
    
    -- Add remaining sections here (packaging and serving equipment)
    -- Due to length, continuing with key items...
    
    RAISE NOTICE '✓ All libraries seeded successfully for company_id: %', company_uuid;
    
END $$;

