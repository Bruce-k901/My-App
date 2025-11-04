-- Seed Data: Packaging Library - 30 Items
-- Run this AFTER the migration to add pack_cost column
-- 
-- INSTRUCTIONS:
-- 1. First, get your company_id by running: SELECT id, name FROM companies LIMIT 1;
-- 2. Replace 'YOUR_COMPANY_ID' below with your actual company_id UUID
-- 3. Or use this version that auto-detects: See alternative script below
--
-- Note: This script uses pack_cost (not unit_cost) and calculates unit_cost = pack_cost / pack_size
-- All prices are example values - adjust as needed

-- Food Containers (Plastic & Card)
INSERT INTO packaging_library (company_id, item_name, category, material, capacity_size, eco_friendly, compostable, recyclable, hot_food_suitable, microwave_safe, leak_proof, color_finish, supplier, pack_cost, pack_size, dimensions, usage_context, reorder_level, notes) VALUES
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Rectangular Container - Small (400ml)', 'Food Containers', 'Plastic', '400ml', false, false, true, true, true, true, 'Clear', 'PackSupply Co', 15.50, 50, '15x10x5cm', 'Soups, sides, small portions', 200, 'Polypropylene, leak-proof lid'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Rectangular Container - Medium (650ml)', 'Food Containers', 'Plastic', '650ml', false, false, true, true, true, true, 'Clear', 'PackSupply Co', 18.75, 50, '18x12x6cm', 'Main meals, salads', 200, 'Polypropylene, leak-proof lid'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Rectangular Container - Large (850ml)', 'Food Containers', 'Plastic', '850ml', false, false, true, true, true, true, 'Clear', 'PackSupply Co', 22.00, 50, '20x14x7cm', 'Large portions, sharing', 200, 'Polypropylene, leak-proof lid'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Square Container - Small (400ml)', 'Food Containers', 'Cardboard', '400ml', true, true, true, true, false, false, 'Brown', 'EcoPack Ltd', 12.50, 100, '12x12x5cm', 'Dry foods, pastries', 300, 'Compostable, biodegradable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Square Container - Medium (600ml)', 'Food Containers', 'Cardboard', '600ml', true, true, true, true, false, false, 'Brown', 'EcoPack Ltd', 16.00, 100, '15x15x6cm', 'Wraps, sandwiches', 300, 'Compostable, biodegradable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Square Container - Large (900ml)', 'Food Containers', 'Cardboard', '900ml', true, true, true, true, false, false, 'Brown', 'EcoPack Ltd', 19.50, 100, '18x18x7cm', 'Large wraps, meals', 300, 'Compostable, biodegradable'),

-- Coffee Cups (All Sizes)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Small (8oz/236ml)', 'Drink Cups', 'Cardboard', '8oz', true, true, true, true, false, false, 'White', 'EcoCup Solutions', 8.50, 100, '7.5cm diameter', 'Espresso, small drinks', 500, 'Sleeve included, compostable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Regular (12oz/355ml)', 'Drink Cups', 'Cardboard', '12oz', true, true, true, true, false, false, 'White', 'EcoCup Solutions', 9.75, 100, '8.5cm diameter', 'Standard coffee, tea', 500, 'Sleeve included, compostable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Large (16oz/473ml)', 'Drink Cups', 'Cardboard', '16oz', true, true, true, true, false, false, 'White', 'EcoCup Solutions', 11.00, 100, '9.5cm diameter', 'Large coffee, lattes', 500, 'Sleeve included, compostable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Extra Large (20oz/591ml)', 'Drink Cups', 'Cardboard', '20oz', true, true, true, true, false, false, 'White', 'EcoCup Solutions', 12.50, 100, '10.5cm diameter', 'Extra large drinks', 500, 'Sleeve included, compostable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Small (8oz) - Plastic', 'Drink Cups', 'Plastic', '8oz', false, false, true, true, false, true, 'Clear', 'PlastiCups Inc', 12.00, 50, '7.5cm diameter', 'Hot beverages, reusable look', 300, 'Double-walled, leak-proof'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Regular (12oz) - Plastic', 'Drink Cups', 'Plastic', '12oz', false, false, true, true, false, true, 'Clear', 'PlastiCups Inc', 13.50, 50, '8.5cm diameter', 'Hot beverages, reusable look', 300, 'Double-walled, leak-proof'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Coffee Cup - Large (16oz) - Plastic', 'Drink Cups', 'Plastic', '16oz', false, false, true, true, false, true, 'Clear', 'PlastiCups Inc', 15.00, 50, '9.5cm diameter', 'Hot beverages, reusable look', 300, 'Double-walled, leak-proof'),

-- Napkins
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Dinner Napkins - White', 'Napkins', 'Paper', 'Single ply', true, true, true, false, false, false, 'White', 'PaperGoods Ltd', 4.50, 500, '33x33cm', 'Dining tables, service', 1000, 'Soft, absorbent'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Dinner Napkins - Printed', 'Napkins', 'Paper', 'Single ply', true, true, true, false, false, false, 'Patterned', 'PaperGoods Ltd', 6.00, 500, '33x33cm', 'Dining tables, branded', 1000, 'Custom printed, absorbent'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cocktail Napkins', 'Napkins', 'Paper', 'Single ply', true, true, true, false, false, false, 'White', 'PaperGoods Ltd', 3.00, 500, '20x20cm', 'Bar service, drinks', 1000, 'Small size, absorbent'),

-- Carry Bags (3 Sizes)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Carry Bag - Small', 'Bags', 'Plastic', '25x35cm', false, false, true, false, false, false, 'Clear/White', 'BagSupply Co', 8.00, 100, '25x35cm', 'Light items, small orders', 500, 'Handles, standard weight'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Carry Bag - Medium', 'Bags', 'Plastic', '30x40cm', false, false, true, false, false, false, 'Clear/White', 'BagSupply Co', 10.50, 100, '30x40cm', 'Standard orders', 500, 'Handles, medium weight'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Carry Bag - Large', 'Bags', 'Plastic', '40x50cm', false, false, true, false, false, false, 'Clear/White', 'BagSupply Co', 13.00, 100, '40x50cm', 'Large orders, multiple items', 500, 'Handles, heavy duty'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Carry Bag - Small', 'Bags', 'Cardboard', '25x35cm', true, true, true, false, false, false, 'Brown', 'EcoBag Solutions', 12.00, 100, '25x35cm', 'Eco-friendly option', 400, 'Recycled, reinforced handles'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Carry Bag - Medium', 'Bags', 'Cardboard', '30x40cm', true, true, true, false, false, false, 'Brown', 'EcoBag Solutions', 15.00, 100, '30x40cm', 'Eco-friendly option', 400, 'Recycled, reinforced handles'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Carry Bag - Large', 'Bags', 'Cardboard', '40x50cm', true, true, true, false, false, false, 'Brown', 'EcoBag Solutions', 18.50, 100, '40x50cm', 'Eco-friendly option', 400, 'Recycled, reinforced handles'),

-- Sauce Cups (2oz, 4oz, etc.)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Cup - 1oz', 'Food Containers', 'Plastic', '1oz/30ml', false, false, true, false, false, true, 'Clear', 'CondimentSupply', 5.50, 100, '5cm diameter', 'Dips, small sauces', 800, 'Lid included, leak-proof'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Cup - 2oz', 'Food Containers', 'Plastic', '2oz/59ml', false, false, true, false, false, true, 'Clear', 'CondimentSupply', 6.25, 100, '6cm diameter', 'Standard sauces, dressings', 800, 'Lid included, leak-proof'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Cup - 4oz', 'Food Containers', 'Plastic', '4oz/118ml', false, false, true, false, false, true, 'Clear', 'CondimentSupply', 7.50, 100, '7cm diameter', 'Large sauces, sides', 800, 'Lid included, leak-proof'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Cup - 6oz', 'Food Containers', 'Plastic', '6oz/177ml', false, false, true, false, false, true, 'Clear', 'CondimentSupply', 8.75, 100, '8cm diameter', 'Extra large portions', 800, 'Lid included, leak-proof'),

-- Additional Items
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Lid for 8oz Cup', 'Lids', 'Plastic', '8oz', false, false, true, true, false, false, 'Clear', 'EcoCup Solutions', 4.50, 200, '8oz fit', 'Coffee cup lids', 1000, 'Snap-on, leak-resistant'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Lid for 12oz Cup', 'Lids', 'Plastic', '12oz', false, false, true, true, false, false, 'Clear', 'EcoCup Solutions', 5.00, 200, '12oz fit', 'Coffee cup lids', 1000, 'Snap-on, leak-resistant'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Lid for 16oz Cup', 'Lids', 'Plastic', '16oz', false, false, true, true, false, false, 'Clear', 'EcoCup Solutions', 5.50, 200, '16oz fit', 'Coffee cup lids', 1000, 'Snap-on, leak-resistant'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Lid for 20oz Cup', 'Lids', 'Plastic', '20oz', false, false, true, true, false, false, 'Clear', 'EcoCup Solutions', 6.00, 200, '20oz fit', 'Coffee cup lids', 1000, 'Snap-on, leak-resistant'),

-- Food Wrap & Accessories
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Foil Wrap - Standard', 'Food Containers', 'Aluminum', '30cm width', false, false, true, true, false, false, 'Silver', 'WrapSupply Co', 12.00, 50, '30cm x 200m roll', 'Hot food wrapping', 100, 'Heat-resistant, flexible'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Cling Film - Commercial', 'Food Containers', 'Plastic', '30cm width', false, false, true, false, false, false, 'Clear', 'WrapSupply Co', 8.50, 50, '30cm x 500m roll', 'Food storage, wrapping', 100, 'Air-tight seal'),

-- Straws (optional)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paper Straws - Standard', 'Straws', 'Paper', '21cm', true, true, true, false, false, false, 'White/Printed', 'EcoStraw Co', 6.50, 500, '21cm length', 'Beverages, eco-friendly', 2000, 'Compostable, 6mm diameter'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Plastic Straws - Standard', 'Straws', 'Plastic', '21cm', false, false, true, false, false, false, 'Clear/Colored', 'PlastiStraw Inc', 4.00, 500, '21cm length', 'Beverages, standard', 2000, 'Flexible, 6mm diameter');

