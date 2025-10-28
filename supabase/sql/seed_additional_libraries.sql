-- ============================================
-- SEED DATA FOR ADDITIONAL LIBRARIES
-- ============================================
-- This file seeds: glassware_library, packaging_library, serving_equipment_library
-- 
-- IMPORTANT: Replace 'YOUR_COMPANY_ID_HERE' with your actual company_id from the companies table
-- You can find your company_id by running: SELECT id FROM companies LIMIT 1;
-- 
-- To use this file:
-- 1. Find your company_id: SELECT id FROM companies;
-- 2. Replace 'YOUR_COMPANY_ID_HERE' below with your actual UUID
-- 3. Run this entire file

-- Replace this with your actual company_id:
\set company_id 'YOUR_COMPANY_ID_HERE'

-- ============================================
-- GLASSWARE_LIBRARY SEED DATA
-- ============================================

-- Beer Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
(:company_id, 'Pint Glass', 'Beer', 568, 'Glass', 'Pint', 'Ale, Lager, Cider', 'Eclipse', 1.50, 12, true, 'Low', 'Bar Shelf A', 12, 'UK standard pint'),
('00000000-0000-0000-0000-000000000000', 'Half Pint Glass', 'Beer', 284, 'Glass', 'Half Pint', 'Beer samples, Lighter beers', 'Eclipse', 1.20, 12, true, 'Low', 'Bar Shelf A', 12, 'Standard half pint'),
('00000000-0000-0000-0000-000000000000', 'Tulip Glass', 'Beer', 500, 'Glass', 'Tulip', 'IPA, Belgian Ale', 'Eclipse', 2.50, 6, true, 'Medium', 'Bar Shelf B', 6, 'Premium beer glass'),
('00000000-0000-0000-0000-000000000000', 'Schooner Glass', 'Beer', 425, 'Glass', 'Schooner', 'Lager, Pale Ale', 'Eclipse', 1.80, 8, true, 'Low', 'Bar Shelf A', 8, 'Australian standard'),
('00000000-0000-0000-0000-000000000000', 'Pilsner Glass', 'Beer', 500, 'Glass', 'Pilsner', 'Pilsner, Helles', 'Eclipse', 2.00, 8, true, 'Medium', 'Bar Shelf B', 8, 'Tall tapered');

-- Wine Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Red Wine Glass', 'Wine', 250, 'Crystal', 'Bordeaux', 'Red Wine', 'Stölzle', 3.50, 6, true, 'Medium', 'Bar Shelf C', 12, 'Riedel-style shape'),
('00000000-0000-0000-0000-000000000000', 'White Wine Glass', 'Wine', 175, 'Crystal', 'Burgundy', 'White Wine, Rosé', 'Stölzle', 3.50, 6, true, 'Medium', 'Bar Shelf C', 12, 'Slightly smaller bowl'),
('00000000-0000-0000-0000-000000000000', 'Champagne Flute', 'Wine', 150, 'Crystal', 'Flute', 'Champagne, Prosecco, Cava', 'Stölzle', 4.00, 6, true, 'High', 'Bar Shelf C', 6, 'Fragile - handle with care'),
('00000000-0000-0000-0000-000000000000', 'Wine Glass Standard', 'Wine', 200, 'Glass', 'Universal', 'House wine', 'Eclipse', 1.50, 12, true, 'Low', 'Bar Shelf C', 24, 'All-purpose wine glass');

-- Cocktail Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Martini Glass', 'Cocktails', 175, 'Glass', 'Coupe', 'Martini, Manhattan', 'Libbey', 2.50, 6, true, 'High', 'Bar Shelf D', 6, 'Classic cocktail glass'),
('00000000-0000-0000-0000-000000000000', 'Coupe Glass', 'Cocktails', 170, 'Glass', 'Coupe', 'Champagne cocktails, Sours', 'Libbey', 2.50, 6, true, 'High', 'Bar Shelf D', 6, 'Wide shallow bowl'),
('00000000-0000-0000-0000-000000000000', 'Margarita Glass', 'Cocktails', 300, 'Glass', 'Margarita', 'Margarita, Frozen cocktails', 'Libbey', 2.00, 6, true, 'High', 'Bar Shelf D', 6, 'Rimmed glass'),
('00000000-0000-0000-0000-000000000000', 'Hurricane Glass', 'Cocktails', 450, 'Glass', 'Hurricane', 'Tiki drinks, Fruit cocktails', 'Libbey', 2.00, 6, true, 'Medium', 'Bar Shelf D', 6, 'Tall exotic'),
('00000000-0000-0000-0000-000000000000', 'Rocks Glass', 'Cocktails', 250, 'Glass', 'Old Fashioned', 'Whisky neat, Old Fashioned', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Short tumbler'),
('00000000-0000-0000-0000-000000000000', 'Highball Glass', 'Cocktails', 350, 'Glass', 'Highball', 'Gin & Tonic, Highballs', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Tall straight'),
('00000000-0000-0000-0000-000000000000', 'Collins Glass', 'Cocktails', 375, 'Glass', 'Collins', 'Tom Collins, Mojito', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf D', 12, 'Tall with ice capacity');

-- Spirits Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Shot Glass 25ml', 'Spirits', 25, 'Glass', 'Standard', 'Shots, Spirits', 'Libbey', 0.50, 20, true, 'Low', 'Bar Shelf E', 40, 'Single shot'),
('00000000-0000-0000-0000-000000000000', 'Shot Glass 50ml', 'Spirits', 50, 'Glass', 'Standard', 'Double shots', 'Libbey', 0.60, 20, true, 'Low', 'Bar Shelf E', 40, 'Double shot'),
('00000000-0000-0000-0000-000000000000', 'Copita Glass', 'Spirits', 100, 'Crystal', 'Tulip', 'Whisky nosing, Cognac', 'Stölzle', 2.00, 6, true, 'High', 'Bar Shelf E', 6, 'Premium tasting glass');

-- Hot Beverages Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Espresso Cup', 'Hot Beverages', 75, 'Porcelain', 'Demitasse', 'Espresso', 'ACME', 1.50, 8, true, 'Low', 'Kitchen Shelf A', 16, 'Small white cup'),
('00000000-0000-0000-0000-000000000000', 'Cappuccino Cup', 'Hot Beverages', 180, 'Porcelain', 'Wide Bowl', 'Cappuccino, Flat White', 'ACME', 2.00, 6, true, 'Low', 'Kitchen Shelf A', 12, 'Medium with saucer'),
('00000000-0000-0000-0000-000000000000', 'Latte Glass', 'Hot Beverages', 240, 'Glass', 'Tall Glass', 'Latte, Piccolo', 'Libbey', 1.80, 6, true, 'Medium', 'Kitchen Shelf A', 12, 'Tall clear glass'),
('00000000-0000-0000-0000-000000000000', 'Tea Cup', 'Hot Beverages', 200, 'Porcelain', 'Standard', 'Tea, Hot Chocolate', 'ACME', 1.80, 6, true, 'Low', 'Kitchen Shelf A', 12, 'Classic tea cup'),
('00000000-0000-0000-0000-000000000000', 'Coffee Mug', 'Hot Beverages', 350, 'Ceramic', 'Mug', 'Coffee, Tea, Hot drinks', 'ACME', 1.50, 8, true, 'Low', 'Kitchen Shelf A', 16, 'Large mug');

-- Soft Drinks Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Tumbler 250ml', 'Soft Drinks', 250, 'Glass', 'Tumbler', 'Soft drinks, Water', 'Libbey', 1.00, 12, true, 'Low', 'Bar Shelf F', 24, 'Standard tumbler'),
('00000000-0000-0000-0000-000000000000', 'Tumbler 350ml', 'Soft Drinks', 350, 'Glass', 'Tumbler', 'Soft drinks, Larger serves', 'Libbey', 1.20, 12, true, 'Low', 'Bar Shelf F', 24, 'Large tumbler'),
('00000000-0000-0000-0000-000000000000', 'Hi-ball Glass', 'Soft Drinks', 400, 'Glass', 'Highball', 'Coca Cola, Mixers', 'Libbey', 1.50, 8, true, 'Low', 'Bar Shelf F', 16, 'Tall with ice');

-- Specialist Glasses
INSERT INTO glassware_library (company_id, item_name, category, capacity_ml, material, shape_style, recommended_for, supplier, unit_cost, pack_size, dishwasher_safe, breakage_rate, storage_location, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Brandy Balloon', 'Specialist', 150, 'Crystal', 'Balloon', 'Brandy, Cognac', 'Stölzle', 3.00, 4, true, 'High', 'Bar Shelf E', 4, 'Large bowled'),
('00000000-0000-0000-0000-000000000000', 'Irish Coffee Glass', 'Specialist', 220, 'Glass', 'Mug', 'Irish Coffee, Hot cocktails', 'Libbey', 2.00, 6, true, 'Medium', 'Bar Shelf D', 6, 'Stemmed mug'),
('00000000-0000-0000-0000-000000000000', 'Tiki Mug', 'Specialist', 500, 'Ceramic', 'Tiki', 'Tiki cocktails, Zombie', 'Custom', 8.00, 2, true, 'Low', 'Bar Shelf D', 2, 'Decorative');

-- ============================================
-- PACKAGING_LIBRARY SEED DATA
-- ============================================

-- Food Containers
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Kraft Salad Box 500ml', 'Food Containers', 'Kraft Card', '500ml', true, true, true, false, false, false, 'Natural Kraft', 'EcoPack', 0.08, 100, '15 x 12 x 6cm', 'Cold food', 500, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Kraft Salad Box 750ml', 'Food Containers', 'Kraft Card', '750ml', true, true, true, false, false, false, 'Natural Kraft', 'EcoPack', 0.10, 100, '17 x 14 x 7cm', 'Cold food', 500, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Kraft Salad Box 1000ml', 'Food Containers', 'Kraft Card', '1000ml', true, true, true, false, false, false, 'Natural Kraft', 'EcoPack', 0.12, 100, '20 x 16 x 8cm', 'Cold food', 500, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Clear Soup Container 8oz', 'Food Containers', 'Plastic', '8oz', false, false, true, true, true, true, 'Clear', 'Takeaway Co', 0.15, 50, '10 x 10 x 6cm', 'Hot food', 300, 'Leak proof'),
('00000000-0000-0000-0000-000000000000', 'Clear Soup Container 12oz', 'Food Containers', 'Plastic', '12oz', false, false, true, true, true, true, 'Clear', 'Takeaway Co', 0.18, 50, '12 x 12 x 7cm', 'Hot food', 300, 'Leak proof'),
('00000000-0000-0000-0000-000000000000', 'Clear Soup Container 16oz', 'Food Containers', 'Plastic', '16oz', false, false, true, true, true, true, 'Clear', 'Takeaway Co', 0.22, 50, '14 x 14 x 8cm', 'Hot food', 300, 'Leak proof'),
('00000000-0000-0000-0000-000000000000', 'Aluminum Foil Container Small', 'Food Containers', 'Aluminum', 'Small', false, false, true, true, false, false, 'Silver', 'Containers UK', 0.12, 100, '15 x 10 x 4cm', 'Hot food', 500, 'Oven safe'),
('00000000-0000-0000-0000-000000000000', 'Aluminum Foil Container Medium', 'Food Containers', 'Aluminum', 'Medium', false, false, true, true, false, false, 'Silver', 'Containers UK', 0.16, 100, '20 x 15 x 5cm', 'Hot food', 500, 'Oven safe'),
('00000000-0000-0000-0000-000000000000', 'Aluminum Foil Container Large', 'Food Containers', 'Aluminum', 'Large', false, false, true, true, false, false, 'Silver', 'Containers UK', 0.20, 100, '25 x 20 x 6cm', 'Hot food', 500, 'Oven safe');

-- Pizza Boxes
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Pizza Box 7 inch', 'Boxes', 'Cardboard', '7 inch', true, false, true, true, false, false, 'White', 'Pizza Box Co', 0.35, 50, '18 x 18 x 2cm', 'Hot food', 200, 'Small pizza'),
('00000000-0000-0000-0000-000000000000', 'Pizza Box 9 inch', 'Boxes', 'Cardboard', '9 inch', true, false, true, true, false, false, 'White', 'Pizza Box Co', 0.45, 50, '23 x 23 x 2cm', 'Hot food', 200, 'Medium pizza'),
('00000000-0000-0000-0000-000000000000', 'Pizza Box 12 inch', 'Boxes', 'Cardboard', '12 inch', true, false, true, true, false, false, 'White', 'Pizza Box Co', 0.65, 50, '30 x 30 x 3cm', 'Hot food', 200, 'Large pizza'),
('00000000-0000-0000-0000-000000000000', 'Pizza Box 14 inch', 'Boxes', 'Cardboard', '14 inch', true, false, true, true, false, false, 'White', 'Pizza Box Co', 0.85, 50, '35 x 35 x 3cm', 'Hot food', 200, 'Extra large'),
('00000000-0000-0000-0000-000000000000', 'Pizza Box 16 inch', 'Boxes', 'Cardboard', '16 inch', true, false, true, true, false, false, 'White', 'Pizza Box Co', 1.05, 50, '40 x 40 x 3cm', 'Hot food', 200, 'Family size');

-- Burger Boxes
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Burger Box Small', 'Boxes', 'Kraft Card', 'Small', true, true, true, true, false, false, 'Natural Kraft', 'pobox', 0.18, 100, '15 x 11 x 5cm', 'Hot food', 500, 'Single burger'),
('00000000-0000-0000-0000-000000000000', 'Burger Box Medium', 'Boxes', 'Kraft Card', 'Medium', true, true, true, true, false, false, 'Natural Kraft', 'pobox', 0.22, 100, '18 x 13 x 6cm', 'Hot food', 500, 'Large burger'),
('00000000-0000-0000-0000-000000000000', 'Burger Box Large', 'Boxes', 'Kraft Card', 'Large', true, true, true, true, false, false, 'Natural Kraft', 'pobox', 0.28, 100, '22 x 15 x 7cm', 'Hot food', 500, 'Double burger');

-- Drink Cups
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Paper Cup Hot 8oz', 'Drink Cups', 'Paper', '8oz', true, true, true, true, false, false, 'White', 'EcoCup', 0.08, 100, 'Ø8cm x 9cm', 'Hot beverages', 1000, 'Compostable liner'),
('00000000-0000-0000-0000-000000000000', 'Paper Cup Hot 12oz', 'Drink Cups', 'Paper', '12oz', true, true, true, true, false, false, 'White', 'EcoCup', 0.10, 100, 'Ø9cm x 11cm', 'Hot beverages', 1000, 'Compostable liner'),
('00000000-0000-0000-0000-000000000000', 'Paper Cup Hot 16oz', 'Drink Cups', 'Paper', '16oz', true, true, true, true, false, false, 'White', 'EcoCup', 0.12, 100, 'Ø10cm x 13cm', 'Hot beverages', 1000, 'Compostable liner'),
('00000000-0000-0000-0000-000000000000', 'Clear Cup Cold 12oz', 'Drink Cups', 'Plastic', '12oz', false, false, true, false, false, false, 'Clear', 'ClearCup', 0.15, 50, 'Ø9cm x 11cm', 'Cold beverages', 500, 'Plastic cup'),
('00000000-0000-0000-0000-000000000000', 'Clear Cup Cold 16oz', 'Drink Cups', 'Plastic', '16oz', false, false, true, false, false, false, 'Clear', 'ClearCup', 0.18, 50, 'Ø10cm x 13cm', 'Cold beverages', 500, 'Plastic cup'),
('00000000-0000-0000-0000-000000000000', 'Clear Cup Cold 20oz', 'Drink Cups', 'Plastic', '20oz', false, false, true, false, false, false, 'Clear', 'ClearCup', 0.22, 50, 'Ø11cm x 15cm', 'Cold beverages', 500, 'Plastic cup');

-- Lids
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Lid for 8oz Cup', 'Lids', 'Plastic', '8oz', false, false, true, true, false, true, 'Clear', 'EcoCup', 0.03, 200, 'Ø8cm', 'Hot beverages', 2000, 'Heat resistant'),
('00000000-0000-0000-0000-000000000000', 'Lid for 12oz Cup', 'Lids', 'Plastic', '12oz', false, false, true, true, false, true, 'Clear', 'EcoCup', 0.04, 200, 'Ø9cm', 'Hot beverages', 2000, 'Heat resistant'),
('00000000-0000-0000-0000-000000000000', 'Lid for 16oz Cup', 'Lids', 'Plastic', '16oz', false, false, true, true, false, true, 'Clear', 'EcoCup', 0.05, 200, 'Ø10cm', 'Hot beverages', 2000, 'Heat resistant'),
('00000000-0000-0000-0000-000000000000', 'Slurp Lid 12oz', 'Lids', 'Plastic', '12oz', false, false, true, false, false, true, 'Clear', 'ClearCup', 0.05, 200, 'Ø9cm', 'Cold beverages', 1000, 'Sip lid'),
('00000000-0000-0000-0000-000000000000', 'Slurp Lid 16oz', 'Lids', 'Plastic', '16oz', false, false, true, false, false, true, 'Clear', 'ClearCup', 0.06, 200, 'Ø10cm', 'Cold beverages', 1000, 'Sip lid');

-- Bags
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Paper Bag Small', 'Bags', 'Paper', 'Small', true, true, true, false, false, false, 'Natural Kraft', 'BagFactory', 0.05, 200, '25 x 15 x 10cm', 'Packaging', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Paper Bag Medium', 'Bags', 'Paper', 'Medium', true, true, true, false, false, false, 'Natural Kraft', 'BagFactory', 0.08, 200, '35 x 20 x 15cm', 'Packaging', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Paper Bag Large', 'Bags', 'Paper', 'Large', true, true, true, false, false, false, 'Natural Kraft', 'BagFactory', 0.12, 200, '45 x 25 x 20cm', 'Packaging', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Carrier Bag', 'Bags', 'Plastic', 'Large', false, false, true, false, false, false, 'Clear', 'BagFactory', 0.15, 100, '40 x 30 x 40cm', 'Packaging', 500, 'Reusable');

-- Cutlery
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Wooden Fork', 'Cutlery', 'Birch Wood', 'Standard', true, true, true, true, false, false, 'Natural', 'EcoWare', 0.03, 200, '18cm', 'Takeaway', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Wooden Knife', 'Cutlery', 'Birch Wood', 'Standard', true, true, true, true, false, false, 'Natural', 'EcoWare', 0.03, 200, '18cm', 'Takeaway', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Wooden Spoon', 'Cutlery', 'Birch Wood', 'Standard', true, true, true, true, false, false, 'Natural', 'EcoWare', 0.03, 200, '18cm', 'Takeaway', 1000, 'Compostable'),
('00000000-0000-0000-0000-000000000000', 'Wooden Cutlery Set', 'Cutlery', 'Birch Wood', 'Set', true, true, true, true, false, false, 'Natural', 'EcoWare', 0.08, 100, 'Fork/Knife/Spoon', 'Takeaway', 500, 'Full set'),
('00000000-0000-0000-0000-000000000000', 'Bamboo Cutlery Set', 'Cutlery', 'Bamboo', 'Set', true, true, true, true, false, false, 'Natural', 'BambooCo', 0.10, 100, 'Fork/Knife/Spoon', 'Takeaway', 500, 'Premium eco');

-- Napkins & Straws
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, unit_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Napkin Standard', 'Napkins', 'Paper', 'Standard', true, true, true, false, false, false, 'White', 'Napkin Co', 0.01, 500, '30 x 30cm', 'Service', 2000, 'Standard'),
('00000000-0000-0000-0000-000000000000', 'Napkin Premium', 'Napkins', 'Paper', 'Premium', true, true, true, false, false, false, 'Natural', 'Napkin Co', 0.02, 500, '35 x 35cm', 'Service', 1000, 'Thicker'),
('00000000-0000-0000-0000-000000000000', 'Paper Straw 6mm', 'Straws', 'Paper', '6mm', true, true, true, false, false, false, 'White', 'StrawCo', 0.04, 500, '20cm', 'Cold beverages', 1000, 'Regular'),
('00000000-0000-0000-0000-000000000000', 'Paper Straw 8mm', 'Straws', 'Paper', '8mm', true, true, true, false, false, false, 'White', 'StrawCo', 0.05, 500, '20cm', 'Cold beverages', 1000, 'Wide'),
('00000000-0000-0000-0000-000000000000', 'Bamboo Straw', 'Straws', 'Bamboo', 'Standard', true, true, true, false, false, false, 'Natural', 'BambooCo', 0.08, 500, '20cm', 'Cold beverages', 500, 'Reusable');

-- ============================================
-- SERVING_EQUIPMENT_LIBRARY SEED DATA
-- ============================================

-- Platters
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Oval Platter 30cm', 'Platters', 'Porcelain', '30cm', 'Oval', 'Main courses, Sharing', 'White', true, false, 'Catering Equip', 12.00, 'Low', 'Kitchen Shelf B', 'Classic oval'),
('00000000-0000-0000-0000-000000000000', 'Oval Platter 40cm', 'Platters', 'Porcelain', '40cm', 'Oval', 'Large sharing', 'White', true, false, 'Catering Equip', 18.00, 'Low', 'Kitchen Shelf B', 'Extra large'),
('00000000-0000-0000-0000-000000000000', 'Round Platter 35cm', 'Platters', 'Porcelain', '35cm', 'Round', 'Pizza, Sharing', 'White', true, false, 'Catering Equip', 15.00, 'Low', 'Kitchen Shelf B', 'Large round'),
('00000000-0000-0000-0000-000000000000', 'Rectangular Platter 40cm', 'Platters', 'Porcelain', '40cm', 'Rectangular', 'Roasts, Fish', 'White', true, false, 'Catering Equip', 16.00, 'Low', 'Kitchen Shelf B', 'Long format'),
('00000000-0000-0000-0000-000000000000', 'Wooden Platter 35cm', 'Platters', 'Wood', '35cm', 'Round', 'Cheese, Charcuterie', 'Natural', false, false, 'WoodCo', 25.00, 'Low', 'Kitchen Shelf C', 'Rustic aesthetic');

-- Bowls
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Soup Bowl 250ml', 'Bowls', 'Porcelain', '250ml', 'Round', 'Soup, Pasta', 'White', true, false, 'Catering Equip', 3.50, 'Low', 'Kitchen Shelf D', 'Small'),
('00000000-0000-0000-0000-000000000000', 'Soup Bowl 400ml', 'Bowls', 'Porcelain', '400ml', 'Round', 'Soup, Larger serves', 'White', true, false, 'Catering Equip', 4.50, 'Low', 'Kitchen Shelf D', 'Large'),
('00000000-0000-0000-0000-000000000000', 'Side Bowl 150ml', 'Bowls', 'Porcelain', '150ml', 'Round', 'Sides, Condiments', 'White', true, false, 'Catering Equip', 2.50, 'Low', 'Kitchen Shelf D', 'Small'),
('00000000-0000-0000-0000-000000000000', 'Salad Bowl 1L', 'Bowls', 'Porcelain', '1L', 'Round', 'Salads, Sharing', 'White', true, false, 'Catering Equip', 8.00, 'Low', 'Kitchen Shelf D', 'Large');

-- Baskets
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Bread Basket Small', 'Baskets', 'Wicker', 'Small', 'Oval', 'Bread, Rolls', 'Natural', false, false, 'BasketCo', 12.00, 'Low', 'Kitchen Shelf E', 'Small basket'),
('00000000-0000-0000-0000-000000000000', 'Bread Basket Large', 'Baskets', 'Wicker', 'Large', 'Oval', 'Bread, Sharing', 'Natural', false, false, 'BasketCo', 18.00, 'Low', 'Kitchen Shelf E', 'Large basket'),
('00000000-0000-0000-0000-000000000000', 'Bread Basket Rectangular', 'Baskets', 'Wicker', 'Rectangular', 'Rectangular', 'Bread, Baguettes', 'Natural', false, false, 'BasketCo', 15.00, 'Low', 'Kitchen Shelf E', 'Long format');

-- Boards
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Wooden Cheese Board', 'Boards', 'Hardwood', '30cm', 'Round', 'Cheese', 'Natural', false, false, 'WoodCo', 35.00, 'Low', 'Kitchen Shelf C', 'Cheese presentation'),
('00000000-0000-0000-0000-000000000000', 'Slate Cheese Board', 'Boards', 'Slate', '35cm', 'Rectangular', 'Cheese, Sharing', 'Black', false, false, 'SlateCo', 45.00, 'Low', 'Kitchen Shelf C', 'Premium slate'),
('00000000-0000-0000-0000-000000000000', 'Wooden Pizza Board', 'Boards', 'Wood', '36cm', 'Round', 'Pizza serving', 'Natural', false, false, 'WoodCo', 25.00, 'Low', 'Kitchen Shelf C', 'Pizza base'),
('00000000-0000-0000-0000-000000000000', 'Charcuterie Board Large', 'Boards', 'Hardwood', '50cm', 'Oval', 'Charcuterie, Sharing', 'Natural', false, false, 'WoodCo', 55.00, 'Low', 'Kitchen Shelf C', 'Grazing board');

-- Stands & Trays
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Cake Stand 2 Tier', 'Stands', 'Metal', '30cm', 'Round', 'Desserts, Display', 'Silver', true, false, 'MetalCo', 45.00, 'Low', 'Kitchen Shelf F', 'Two tier'),
('00000000-0000-0000-0000-000000000000', 'Cake Stand 3 Tier', 'Stands', 'Metal', '35cm', 'Round', 'Desserts, Display', 'Silver', true, false, 'MetalCo', 65.00, 'Low', 'Kitchen Shelf F', 'Three tier'),
('00000000-0000-0000-0000-000000000000', 'Service Tray 40cm', 'Trays', 'Stainless Steel', '40cm', 'Rectangular', 'Food service', 'Silver', true, false, 'MetalCo', 35.00, 'Low', 'Kitchen Shelf F', 'Large tray'),
('00000000-0000-0000-0000-000000000000', 'Round Service Tray 35cm', 'Trays', 'Plastic', '35cm', 'Round', 'Drinks service', 'White', true, false, 'PlasticCo', 15.00, 'Low', 'Kitchen Shelf F', 'Lightweight');

-- Dishes & Holders
INSERT INTO serving_equipment_library (company_id, item_name, category, material, size_dimensions, shape, use_case, color_finish, dishwasher_safe, oven_safe, supplier, unit_cost, breakage_rate, storage_location, notes) VALUES
('00000000-0000-0000-0000-000000000000', 'Butter Dish', 'Dishes', 'Porcelain', 'Small', 'Round', 'Butter service', 'White', true, false, 'Catering Equip', 4.00, 'Low', 'Kitchen Shelf D', 'Small dish'),
('00000000-0000-0000-0000-000000000000', 'Sauce Boat', 'Dishes', 'Porcelain', '150ml', 'Oval', 'Sauce service', 'White', true, false, 'Catering Equip', 5.00, 'Low', 'Kitchen Shelf D', 'With spout'),
('00000000-0000-0000-0000-000000000000', 'Condiment Holder', 'Holders', 'Metal', 'Medium', 'Rectangular', 'Salt, Pepper, Oil', 'Silver', true, false, 'MetalCo', 12.00, 'Low', 'Kitchen Shelf F', 'Multi-compartment'),
('00000000-0000-0000-0000-000000000000', 'Oil & Vinegar Set', 'Holders', 'Glass', '200ml', 'Round', 'Oil, Vinegar', 'Clear', true, false, 'GlassCo', 15.00, 'Medium', 'Kitchen Shelf F', 'Decanters');

