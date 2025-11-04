-- ============================================
-- Seed Data for serving_equipment_library
-- ============================================
-- This script inserts 50 commercial kitchen equipment items
-- Company ID: f99510bc-b290-47c6-8f12-282bea67bd91

-- Note: Make sure to run serving_equipment_library_migration.sql first!

INSERT INTO serving_equipment_library (
    company_id, 
    item_name, 
    category, 
    material, 
    size_dimensions, 
    shape, 
    use_case, 
    color_finish, 
    dishwasher_safe, 
    oven_safe, 
    supplier, 
    brand,
    color_coding,
    unit_cost, 
    storage_location, 
    notes
) VALUES
-- Pots & Pans
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Stock Pot - 20L', 'Pots & Pans', 'Stainless Steel', '20L', 'Round', 'Stock, soups, large batches', 'Silver', true, true, 'Kitchen Supply Co', 'Commercial Chef', NULL, 85.00, 'Cook Line - Pot Station', 'Heavy duty, induction compatible'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Saucepan - 5L', 'Pots & Pans', 'Stainless Steel', '5L', 'Round', 'Sauces, reductions', 'Silver', true, true, 'Kitchen Supply Co', 'All-Clad', NULL, 65.00, 'Cook Line - Sauce Station', 'Tri-ply base, even heating'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Frying Pan - 30cm', 'Pots & Pans', 'Carbon Steel', '30cm diameter', 'Round', 'Searing, frying', 'Black', false, true, 'Kitchen Supply Co', 'De Buyer', NULL, 55.00, 'Cook Line - Flat Top', 'Seasoned, professional grade'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauté Pan - 28cm', 'Pots & Pans', 'Stainless Steel', '28cm', 'Round', 'Sautéing, one-pan dishes', 'Silver', true, true, 'Kitchen Supply Co', 'All-Clad', NULL, 75.00, 'Cook Line - Sauté Station', 'Straight sides, lid included'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Roasting Pan - Large', 'Pots & Pans', 'Stainless Steel', '40x30cm', 'Rectangular', 'Roasts, sheet pan meals', 'Silver', true, true, 'Kitchen Supply Co', 'Commercial Chef', NULL, 95.00, 'Oven Area', 'Heavy gauge, rack included'),

-- Knives
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chef Knife - 20cm', 'Knives', 'High Carbon Steel', '20cm blade', 'Rectangular', 'General prep, chopping', 'Silver', false, false, 'Knife Supplier Ltd', 'Wusthof', 'Blue', 120.00, 'Prep Station - Knife Block', 'Triple-riveted handle, professional grade'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paring Knife - 10cm', 'Knives', 'High Carbon Steel', '10cm blade', 'Rectangular', 'Fine cuts, peeling', 'Silver', false, false, 'Knife Supplier Ltd', 'Wusthof', 'Blue', 45.00, 'Prep Station - Knife Block', 'Precision cutting'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bread Knife - 25cm', 'Knives', 'Stainless Steel', '25cm serrated blade', 'Rectangular', 'Bread, tomatoes', 'Silver', false, false, 'Knife Supplier Ltd', 'Victorinox', 'Blue', 55.00, 'Prep Station - Knife Block', 'Serrated edge'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Boning Knife - 15cm', 'Knives', 'High Carbon Steel', '15cm flexible blade', 'Rectangular', 'Deboning, trimming', 'Silver', false, false, 'Knife Supplier Ltd', 'Wusthof', 'Blue', 85.00, 'Prep Station - Knife Block', 'Flexible blade for precision'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Carving Knife - 30cm', 'Knives', 'Stainless Steel', '30cm blade', 'Rectangular', 'Carving roasts, slicing', 'Silver', false, false, 'Knife Supplier Ltd', 'Victorinox', 'Blue', 75.00, 'Prep Station - Knife Block', 'Long thin blade'),

-- Utensils - Tongs & Forks
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Tongs - 30cm', 'Utensils', 'Stainless Steel', '30cm', 'Irregular', 'Turning, serving', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 12.00, 'Cook Line - Utensil Rack', 'Locking mechanism'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Tongs - 40cm', 'Utensils', 'Stainless Steel', '40cm', 'Irregular', 'BBQ, large items', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 15.00, 'Cook Line - Utensil Rack', 'Long reach'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Meat Fork - 2 Prong', 'Utensils', 'Stainless Steel', '25cm', 'Irregular', 'Turning meats, testing doneness', 'Silver', true, false, 'Kitchen Supply Co', 'Commercial Chef', NULL, 8.00, 'Cook Line - Utensil Rack', 'Two-prong design'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Slotted Spoon - Large', 'Utensils', 'Stainless Steel', '30cm handle, 12cm head', 'Round', 'Straining, serving', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 10.00, 'Cook Line - Utensil Rack', 'Slotted for draining'),

-- Spoons
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Metal Spoon - Large', 'Utensils', 'Stainless Steel', '30cm', 'Round', 'Stirring, serving', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 6.00, 'Cook Line - Utensil Rack', 'Heavy duty'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Metal Spoon - Small', 'Utensils', 'Stainless Steel', '20cm', 'Round', 'Tasting, small amounts', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 4.00, 'Cook Line - Utensil Rack', 'Precise'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Plastic Spoon - Red', 'Utensils', 'Food Grade Plastic', '25cm', 'Round', 'Non-reactive stirring', 'Red', true, false, 'Kitchen Supply Co', 'Cambro', 'Red', 3.50, 'Prep Station - Color Coded', 'Food safety color coding'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Plastic Spoon - Blue', 'Utensils', 'Food Grade Plastic', '25cm', 'Round', 'Non-reactive stirring', 'Blue', true, false, 'Kitchen Supply Co', 'Cambro', 'Blue', 3.50, 'Prep Station - Color Coded', 'Food safety color coding'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Plastic Spoon - Green', 'Utensils', 'Food Grade Plastic', '25cm', 'Round', 'Non-reactive stirring', 'Green', true, false, 'Kitchen Supply Co', 'Cambro', 'Green', 3.50, 'Prep Station - Color Coded', 'Food safety color coding'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Wooden Spoon - Large', 'Utensils', 'Bamboo', '35cm', 'Round', 'Non-scratch stirring', 'Natural', false, false, 'Kitchen Supply Co', 'Oxo Good Grips', NULL, 8.00, 'Cook Line - Utensil Rack', 'Bamboo, eco-friendly'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Wooden Spoon - Small', 'Utensils', 'Bamboo', '25cm', 'Round', 'Precise stirring', 'Natural', false, false, 'Kitchen Supply Co', 'Oxo Good Grips', NULL, 6.00, 'Cook Line - Utensil Rack', 'Bamboo'),

-- Stirrers & Whisks
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Balloon Whisk - Large', 'Utensils', 'Stainless Steel', '30cm, 12 wires', 'Round', 'Whipping, aerating', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 15.00, 'Cook Line - Utensil Rack', 'Professional grade'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Balloon Whisk - Small', 'Utensils', 'Stainless Steel', '20cm, 8 wires', 'Round', 'Small batches, sauces', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 10.00, 'Cook Line - Utensil Rack', 'Compact'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Flat Whisk', 'Utensils', 'Stainless Steel', '25cm', 'Rectangular', 'Roux, flat bottom pans', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 12.00, 'Cook Line - Utensil Rack', 'Flat design'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Whisk', 'Utensils', 'Stainless Steel', '20cm', 'Round', 'Sauces, small pans', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 9.00, 'Cook Line - Utensil Rack', 'Narrow head'),

-- Scrapers & Spatulas
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bowl Scraper - Plastic', 'Tools', 'Food Grade Plastic', '15cm', 'Rectangular', 'Bowl scraping, dough', 'Red', true, false, 'Kitchen Supply Co', 'Ateco', 'Red', 4.00, 'Baking Station', 'Flexible, color coded'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bench Scraper - Metal', 'Tools', 'Stainless Steel', '15cm blade, 8cm handle', 'Rectangular', 'Dough, cleanup', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 18.00, 'Baking Station', 'Dual purpose'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Spatula - Fish', 'Utensils', 'Stainless Steel', '30cm', 'Rectangular', 'Flipping delicate items', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 22.00, 'Cook Line - Utensil Rack', 'Thin, flexible'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Offset Spatula - Large', 'Tools', 'Stainless Steel', '30cm blade', 'Rectangular', 'Frosting, spreading', 'Silver', true, false, 'Kitchen Supply Co', 'Ateco', NULL, 25.00, 'Baking Station', 'Offset handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Offset Spatula - Small', 'Tools', 'Stainless Steel', '15cm blade', 'Rectangular', 'Detail work, small cakes', 'Silver', true, false, 'Kitchen Supply Co', 'Ateco', NULL, 15.00, 'Baking Station', 'Precision work'),

-- Mixers & Blenders
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hand Mixer - Stand', 'Mixers', 'Plastic/Metal', 'Variable speed', 'Irregular', 'Mixing, whipping', 'White', false, false, 'Equipment Suppliers', 'KitchenAid', NULL, 125.00, 'Baking Station', '5 speeds, attachments'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Immersion Blender', 'Blenders', 'Stainless Steel/Plastic', 'Variable speed', 'Irregular', 'Soups, purees, sauces', 'Black/Silver', false, false, 'Equipment Suppliers', 'Vitamix', NULL, 95.00, 'Prep Station', 'Stick blender, detachable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Countertop Blender', 'Blenders', 'Glass/Plastic', '2L capacity', 'Round', 'Smoothies, purees', 'Black', false, false, 'Equipment Suppliers', 'Vitamix', NULL, 450.00, 'Drink Station', 'High speed, professional'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'RoboCoupe - Food Processor', 'Blenders', 'Stainless Steel', '3.5L bowl', 'Round', 'Chopping, pureeing, dough', 'Silver', false, false, 'Equipment Suppliers', 'Robot Coupe', NULL, 850.00, 'Prep Station', 'Commercial food processor'),

-- Measuring Tools
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Digital Scale - 5kg', 'Measuring', 'Plastic/Electronics', '5kg capacity, 1g precision', 'Rectangular', 'Precise weighing', 'White', false, false, 'Equipment Suppliers', 'Escali', NULL, 65.00, 'Baking Station', 'LCD display, tare function'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Digital Scale - 15kg', 'Measuring', 'Stainless Steel/Electronics', '15kg capacity, 5g precision', 'Rectangular', 'Heavy items, bulk', 'Silver', false, false, 'Equipment Suppliers', 'MyWeigh', NULL, 120.00, 'Prep Station', 'Commercial grade'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Measuring Cups - Set', 'Measuring', 'Stainless Steel', '1/4, 1/3, 1/2, 1 cup', 'Round', 'Volume measurement', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 25.00, 'Baking Station', 'Nested set'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Measuring Spoons - Set', 'Measuring', 'Stainless Steel', '1/4, 1/2, 1, 2 tsp, 1 tbsp', 'Round', 'Small measurements', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 12.00, 'Baking Station', 'Magnetic, nested'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Liquid Measuring Cup - 1L', 'Measuring', 'Glass', '1L, metric markings', 'Round', 'Liquids', 'Clear', true, false, 'Kitchen Supply Co', 'Pyrex', NULL, 15.00, 'Baking Station', 'Pour spout'),

-- Thermometers
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Instant Read Thermometer', 'Thermometers', 'Stainless Steel/Electronics', 'Digital display', 'Irregular', 'Quick temp checks', 'Silver/Black', false, false, 'Equipment Suppliers', 'ThermoWorks', NULL, 55.00, 'Cook Line', '2-3 second reading'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Probe Thermometer - Wireless', 'Thermometers', 'Stainless Steel/Electronics', 'Dual probe, wireless', 'Irregular', 'Roasts, monitoring', 'Black', false, false, 'Equipment Suppliers', 'Meater', NULL, 150.00, 'Cook Line', 'Bluetooth, app connected'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Candy Thermometer', 'Thermometers', 'Glass/Stainless Steel', '100-200°C range', 'Irregular', 'Sugar work, deep frying', 'Silver', false, false, 'Equipment Suppliers', 'Taylor', NULL, 25.00, 'Baking Station', 'Clip-on, safety guard'),

-- Strainers & Sieves
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fine Mesh Strainer - Large', 'Strainers', 'Stainless Steel', '25cm diameter', 'Round', 'Straining, sifting', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 28.00, 'Prep Station', 'Fine mesh, durable'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chinois Strainer', 'Strainers', 'Stainless Steel', '20cm, ultra-fine mesh', 'Round', 'Purees, consommé', 'Silver', true, false, 'Kitchen Supply Co', 'Matfer Bourgeat', NULL, 85.00, 'Prep Station', 'Ultra-fine mesh, cone shape'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Colander - Large', 'Strainers', 'Stainless Steel', '30cm, large holes', 'Round', 'Pasta, vegetables', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 35.00, 'Prep Station', 'Large capacity'),

-- Additional Tools
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Peeler - Y-Peeler', 'Tools', 'Stainless Steel/Plastic', 'Standard size', 'Irregular', 'Vegetable peeling', 'Silver/Black', true, false, 'Kitchen Supply Co', 'OXO', NULL, 8.00, 'Prep Station', 'Swivel blade'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Can Opener - Commercial', 'Tools', 'Stainless Steel', 'Heavy duty', 'Irregular', 'Opening cans', 'Silver', true, false, 'Kitchen Supply Co', 'Edlund', NULL, 35.00, 'Prep Station', 'Wall mount, commercial'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Ladle - Large', 'Utensils', 'Stainless Steel', '150ml capacity', 'Round', 'Serving soups, sauces', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 12.00, 'Cook Line - Utensil Rack', 'Pour spout'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Ladle - Small', 'Utensils', 'Stainless Steel', '60ml capacity', 'Round', 'Sauces, small portions', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 8.00, 'Cook Line - Utensil Rack', 'Precision serving'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Pastry Brush - Silicone', 'Tools', 'Silicone', '4cm brush head', 'Irregular', 'Glazing, oiling', 'Black', true, false, 'Kitchen Supply Co', 'OXO', NULL, 10.00, 'Baking Station', 'Heat resistant, easy clean'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Pastry Brush - Natural Bristle', 'Tools', 'Natural Bristle/Wood', '5cm brush head', 'Irregular', 'Egg wash, glazing', 'Natural', false, false, 'Kitchen Supply Co', 'Ateco', NULL, 12.00, 'Baking Station', 'Traditional, soft bristles'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Ice Cream Scoop - Disher', 'Tools', 'Stainless Steel', '#20 (3.5oz)', 'Round', 'Scooping, portioning', 'Silver', true, false, 'Kitchen Supply Co', 'Zeroll', NULL, 18.00, 'Dessert Station', 'Heat-treated, anti-freeze'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Ice Cream Scoop - #16', 'Tools', 'Stainless Steel', '#16 (4oz)', 'Round', 'Larger portions', 'Silver', true, false, 'Kitchen Supply Co', 'Zeroll', NULL, 18.00, 'Dessert Station', 'Standard size'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Zester - Microplane', 'Tools', 'Stainless Steel', 'Standard size', 'Rectangular', 'Zesting, grating', 'Silver', false, false, 'Kitchen Supply Co', 'Microplane', NULL, 22.00, 'Prep Station', 'Ultra-sharp, fine'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Garlic Press', 'Tools', 'Stainless Steel', 'Standard size', 'Irregular', 'Garlic mincing', 'Silver', true, false, 'Kitchen Supply Co', 'OXO', NULL, 20.00, 'Prep Station', 'Easy clean, efficient');

-- Note: This seed data includes 50 items covering:
-- - Pots & Pans (5 items)
-- - Knives (5 items)
-- - Utensils - Tongs, Forks, Spoons (10 items)
-- - Stirrers & Whisks (4 items)
-- - Scrapers & Spatulas (5 items)
-- - Mixers & Blenders (4 items)
-- - Measuring Tools (5 items)
-- - Thermometers (3 items)
-- - Strainers & Sieves (3 items)
-- - Additional Tools (6 items)
-- Total: 50 items

