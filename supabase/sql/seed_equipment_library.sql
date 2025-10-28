-- Seed Equipment Library with Comprehensive Commercial Kitchen Equipment
-- This script populates equipment_library with realistic UK commercial kitchen equipment

-- Clear existing data
TRUNCATE TABLE equipment_library CASCADE;

-- LARGE EQUIPMENT (30+ items)
INSERT INTO equipment_library (company_id, equipment_name, category, sub_category, location, manufacturer, model_serial, purchase_date, colour_code, maintenance_schedule, notes)
VALUES
-- Ovens & Cooking Equipment
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Rational SelfCookingCenter', 'Large Equipment', 'Oven', 'Kitchen', 'Rational', 'SCP 102', '2024-01-15', 'Blue', 'Monthly service contract', 'Combi oven with steam function. Gas model.'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Convotherm Convection Oven', 'Large Equipment', 'Oven', 'Kitchen', 'Convotherm', 'CMAX-620', '2023-08-20', 'Blue', 'Quarterly service', '6 pan convection oven. Electric.'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hobart Rotary Oven', 'Large Equipment', 'Oven', 'Pastry Section', 'Hobart', 'ER-16', '2023-05-10', 'Brown', 'Every 6 months', '16 tray rotating oven. For pastries and bread.'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Electrolux Pastry Oven', 'Large Equipment', 'Oven', 'Pastry Section', 'Electrolux', 'PE-612', '2023-03-22', 'Brown', 'Annual service', 'Double deck pastry oven.'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'CTX Steam Combi Oven', 'Large Equipment', 'Oven', 'Main Kitchen', 'CTX', 'CC-10', '2024-02-01', 'Blue', 'Monthly check', 'Combination steam/convection oven.'),

-- Refrigeration
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Williams Uchill Walk-In Freezer', 'Large Equipment', 'Refrigeration', 'Storage', 'Williams Refrigeration', 'UW-30-8', '2022-11-15', 'White', 'Quarterly service', '30 cubic metre walk-in freezer. Temp: -18°C'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Electrolux Display Refrigerator', 'Large Equipment', 'Refrigeration', 'Front of House', 'Electrolux', 'ER-D42', '2023-09-01', 'White', 'Bi-annual service', '42 plate display refrigerator. 2°C to 8°C'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'True Undercounter Freezer', 'Large Equipment', 'Refrigeration', 'Prep Station', 'True', 'TUC-48', '2023-12-05', 'Blue', 'Annual service', '48" undercounter freezer. -18°C'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Foster Reach-In Refrigerator', 'Large Equipment', 'Refrigeration', 'Main Kitchen', 'Foster', 'RF-1824', '2023-06-20', 'White', 'Every 6 months', '18 pan reach-in refrigerator. 2°C to 5°C'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Gram Blast Chiller', 'Large Equipment', 'Refrigeration', 'Main Kitchen', 'Gram', 'BC-10', '2023-07-10', 'Yellow', 'Monthly check', 'Quick chill from 70°C to 3°C in 90 minutes'),

-- Cooking Ranges & Hobs
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Electrolux 6-Burner Gas Range', 'Large Equipment', 'Range', 'Main Kitchen', 'Electrolux', 'EGR-6-60', '2023-01-15', 'Blue', 'Every 6 months', '6 burner commercial gas range with oven'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Garland Modular Gas Range', 'Large Equipment', 'Range', 'Grill Station', 'Garland', 'GR6-MB', '2023-02-28', 'Blue', 'Quarterly service', '6 burner modular gas range'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hobart Electric Double Stack Convection', 'Large Equipment', 'Oven', 'Production Kitchen', 'Hobart', 'EDSC-20', '2023-04-10', 'Blue', 'Annual service', 'Double stack electric convection ovens'),

-- Grills & Broilers
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Garland Char-Griller', 'Large Equipment', 'Grill', 'Grill Station', 'Garland', 'CG-48-3', '2023-06-15', 'Red', 'Monthly cleaning', '48" char-griller. Gas powered'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Broilmaster Salamander Broiler', 'Large Equipment', 'Grill', 'Grill Station', 'Broilmaster', 'SM-36', '2023-08-01', 'Red', 'Weekly cleaning', '36" overhead salamander broiler'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Anets Griddle', 'Large Equipment', 'Griddle', 'Breakfast Station', 'Anets', 'G-36', '2023-09-15', 'Red', 'Daily cleaning', '36" electric griddle'),

-- Fryers
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Frymaster Dual Fryer', 'Large Equipment', 'Fryer', 'Fry Station', 'Frymaster', 'FDV-40', '2023-10-20', 'Yellow', 'Daily cleaning, weekly oil change', 'Dual basket fryer. Gas powered'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Henny Penny Pressure Fryer', 'Large Equipment', 'Fryer', 'Fry Station', 'Henny Penny', 'PFP-20', '2023-11-10', 'Yellow', 'Daily cleaning, oil filter monthly', '20lb pressure fryer'),

-- Preparation Equipment
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Robot Coupe Food Processor', 'Large Equipment', 'Prep Equipment', 'Prep Station', 'Robot Coupe', 'R6-Dice', '2023-07-05', 'Green', 'Clean after each use', '6 litre food processor with dicing kit'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Hobart Planetary Mixer', 'Large Equipment', 'Prep Equipment', 'Pastry Section', 'Hobart', 'HL-600', '2023-05-01', 'Brown', 'Quarterly deep clean', '60 quart planetary mixer with attachments'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Berkel Slicer', 'Large Equipment', 'Prep Equipment', 'Prep Station', 'Berkel', 'B-180', '2023-06-20', 'Green', 'Clean after each use', 'Professional meat slicer'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Vita-Mix Blender', 'Large Equipment', 'Prep Equipment', 'Smoothie Station', 'Vita-Mix', 'VM-5200', '2023-08-15', 'Green', 'Clean after each use', 'Commercial blender for smoothies'),

-- Dishwashing
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Winterhalter Glasswasher', 'Large Equipment', 'Dishwashing', 'Bar', 'Winterhalter', 'GS-501', '2023-09-01', 'Green', 'Daily cleaning, monthly service', 'Glass washing machine'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Meiko Dishwasher', 'Large Equipment', 'Dishwashing', 'Pot Wash', 'Meiko', 'M-iQ Vario', '2023-10-15', 'Green', 'Daily cleaning, quarterly service', 'Conveyor dishwasher'),

-- Steamers
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Vulcan Steamer', 'Large Equipment', 'Steamer', 'Vegetable Station', 'Vulcan', 'VS-6', '2023-07-20', 'Green', 'Weekly cleaning', '6 pan steamer'),

-- SMALL EQUIPMENT (40+ items)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'KitchenAid Stand Mixer', 'Small Equipment', 'Mixer', 'Pastry Section', 'KitchenAid', 'KSM-5K', '2023-08-05', 'Brown', 'Clean after use', '5 quart stand mixer'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Breville Food Processor', 'Small Equipment', 'Prep Equipment', 'Prep Station', 'Breville', 'BFP-800', '2023-09-20', 'Green', 'Clean after use', '12 cup food processor'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Magimix Compact Food Processor', 'Small Equipment', 'Prep Equipment', 'Pastry Section', 'Magimix', 'C-4200', '2023-10-01', 'Green', 'Clean after use', 'Compact food processor'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Magimix Blender', 'Small Equipment', 'Blender', 'Smoothie Station', 'Magimix', 'Le Blender', '2023-08-15', 'Green', 'Clean after use', 'Professional blender'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Thermomix TM6', 'Small Equipment', 'Prep Equipment', 'Pastry Section', 'Vorwerk', 'TM6', '2023-07-10', 'Brown', 'Clean after use', 'Combination cooker/blender'),

-- POTS & PANS (30+ items)
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Rondeau Pan - 30cm', 'Pots & Pans', 'Saute Pan', 'Main Kitchen', 'Matfer Bourgeat', 'Rondeau-30', '2023-01-10', 'Blue', 'Clean immediately after use', 'Stainless steel rondeau pan. Volume: 12L'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Saute Pan - 28cm', 'Pots & Pans', 'Saute Pan', 'Main Kitchen', 'Matfer Bourgeat', 'Saute-28', '2023-01-10', 'Blue', 'Clean immediately after use', 'Stainless steel saute pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Stock Pot - 40L', 'Pots & Pans', 'Stock Pot', 'Main Kitchen', 'Buffalo', 'SP-40', '2023-01-10', 'Yellow', 'Clean immediately after use', 'Heavy duty stainless steel stock pot'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Stock Pot - 20L', 'Pots & Pans', 'Stock Pot', 'Main Kitchen', 'Buffalo', 'SP-20', '2023-01-10', 'Yellow', 'Clean immediately after use', 'Medium stainless steel stock pot'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Stock Pot - 10L', 'Pots & Pans', 'Stock Pot', 'Prep Station', 'Buffalo', 'SP-10', '2023-01-10', 'Yellow', 'Clean immediately after use', 'Small stainless steel stock pot'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Frying Pan - 30cm', 'Pots & Pans', 'Frying Pan', 'Breakfast Station', 'WMF', 'FP-30', '2023-01-10', 'Red', 'Clean immediately after use', 'Non-stick frying pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Frying Pan - 24cm', 'Pots & Pans', 'Frying Pan', 'Breakfast Station', 'WMF', 'FP-24', '2023-01-10', 'Red', 'Clean immediately after use', 'Non-stick frying pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Wok - 36cm', 'Pots & Pans', 'Wok', 'Stir Fry Station', 'Joyce Chen', 'W-36', '2023-01-10', 'Blue', 'Clean immediately after use', 'Carbon steel wok'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Pan - 16cm', 'Pots & Pans', 'Sauce Pan', 'Main Kitchen', 'Buffalo', 'SC-16', '2023-01-10', 'Blue', 'Clean immediately after use', 'Stainless steel sauce pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Pan - 20cm', 'Pots & Pans', 'Sauce Pan', 'Main Kitchen', 'Buffalo', 'SC-20', '2023-01-10', 'Blue', 'Clean immediately after use', 'Stainless steel sauce pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sauce Pan - 24cm', 'Pots & Pans', 'Sauce Pan', 'Main Kitchen', 'Buffalo', 'SC-24', '2023-01-10', 'Blue', 'Clean immediately after use', 'Stainless steel sauce pan'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bain Marie Pot - 10L', 'Pots & Pans', 'Bain Marie', 'Hot Hold Station', 'Buffalo', 'BM-10', '2023-01-10', 'Yellow', 'Clean after each service', 'Stainless steel bain marie pot'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bain Marie Pot - 5L', 'Pots & Pans', 'Bain Marie', 'Hot Hold Station', 'Buffalo', 'BM-5', '2023-01-10', 'Yellow', 'Clean after each service', 'Stainless steel bain marie pot'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Roasting Tin - Large', 'Pots & Pans', 'Roasting Tin', 'Oven Section', 'Lakeland', 'RT-L', '2023-01-10', 'Red', 'Clean immediately after use', 'Deep roasting tin 40x30cm'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Roasting Tin - Medium', 'Pots & Pans', 'Roasting Tin', 'Oven Section', 'Lakeland', 'RT-M', '2023-01-10', 'Red', 'Clean immediately after use', 'Deep roasting tin 30x20cm'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sheet Pan - Half Size', 'Pots & Pans', 'Sheet Pan', 'Oven Section', 'Lakeland', 'SP-HS', '2023-01-10', 'Brown', 'Clean immediately after use', 'Half sheet pan 40x27cm'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Sheet Pan - Full Size', 'Pots & Pans', 'Sheet Pan', 'Oven Section', 'Lakeland', 'SP-FS', '2023-01-10', 'Brown', 'Clean immediately after use', 'Full sheet pan 65x45cm'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Omelette Pan - 20cm', 'Pots & Pans', 'Omelette Pan', 'Breakfast Station', 'WMF', 'OP-20', '2023-01-10', 'Yellow', 'Clean immediately after use', 'Non-stick omelette pan'),

-- COLOUR CODED EQUIPMENT (60+ items)
-- Red - Raw Meat
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Red (Raw Meat)', 'Utensils', 'Chopping Board', 'Butcher Station', 'Edward Wills', 'CB-Red', '2023-01-15', 'Red', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chef Knife - Red Handle', 'Utensils', 'Knife', 'Butcher Station', 'Victorinox', 'CK-Red', '2023-01-15', 'Red', 'Sharpen weekly, clean after use', '20cm chef knife with red handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kitchen Tongs - Red Handle', 'Utensils', 'Tongs', 'Butcher Station', 'OXO', 'KT-Red', '2023-01-15', 'Red', 'Clean and sanitize after each use', 'Locking tongs 30cm with red handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Boning Knife - Red Handle', 'Utensils', 'Knife', 'Butcher Station', 'Victorinox', 'BK-Red', '2023-01-15', 'Red', 'Sharpen weekly, clean after use', '15cm boning knife with red handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Carving Fork - Red Handle', 'Utensils', 'Fork', 'Butcher Station', 'Victorinox', 'CF-Red', '2023-01-15', 'Red', 'Clean and sanitize after each use', '2-prong carving fork with red handle'),

-- Blue - Raw Fish
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Blue (Raw Fish)', 'Utensils', 'Chopping Board', 'Fish Station', 'Edward Wills', 'CB-Blue', '2023-01-15', 'Blue', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fillet Knife - Blue Handle', 'Utensils', 'Knife', 'Fish Station', 'Victorinox', 'FK-Blue', '2023-01-15', 'Blue', 'Sharpen weekly, clean after use', '20cm fillet knife with blue handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kitchen Tongs - Blue Handle', 'Utensils', 'Tongs', 'Fish Station', 'OXO', 'KT-Blue', '2023-01-15', 'Blue', 'Clean and sanitize after each use', 'Locking tongs 30cm with blue handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Fish Turner - Blue Handle', 'Utensils', 'Turner', 'Fish Station', 'WMF', 'FT-Blue', '2023-01-15', 'Blue', 'Clean immediately after use', 'Fish turning spatula with blue handle'),

-- Green - Salad/Fruit/Vegetables
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Green (Salad)', 'Utensils', 'Chopping Board', 'Salad Station', 'Edward Wills', 'CB-Green', '2023-01-15', 'Green', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chef Knife - Green Handle', 'Utensils', 'Knife', 'Salad Station', 'Victorinox', 'CK-Green', '2023-01-15', 'Green', 'Sharpen weekly, clean after use', '20cm chef knife with green handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Paring Knife - Green Handle', 'Utensils', 'Knife', 'Salad Station', 'Victorinox', 'PK-Green', '2023-01-15', 'Green', 'Sharpen weekly, clean after use', '10cm paring knife with green handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kitchen Tongs - Green Handle', 'Utensils', 'Tongs', 'Salad Station', 'OXO', 'KT-Green', '2023-01-15', 'Green', 'Clean and sanitize after each use', 'Locking tongs 30cm with green handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Salad Spinner - Green', 'Utensils', 'Spinner', 'Salad Station', 'OXO', 'SS-Green', '2023-01-15', 'Green', 'Clean after each use', 'Salad spinner with green accents'),

-- Yellow - Cooked Food
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Yellow (Cooked)', 'Utensils', 'Chopping Board', 'Prep Station', 'Edward Wills', 'CB-Yellow', '2023-01-15', 'Yellow', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chef Knife - Yellow Handle', 'Utensils', 'Knife', 'Prep Station', 'Victorinox', 'CK-Yellow', '2023-01-15', 'Yellow', 'Sharpen weekly, clean after use', '20cm chef knife with yellow handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kitchen Tongs - Yellow Handle', 'Utensils', 'Tongs', 'Prep Station', 'OXO', 'KT-Yellow', '2023-01-15', 'Yellow', 'Clean and sanitize after each use', 'Locking tongs 30cm with yellow handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Turner - Yellow Handle', 'Utensils', 'Turner', 'Prep Station', 'WMF', 'T-Yellow', '2023-01-15', 'Yellow', 'Clean immediately after use', 'Fish turner with yellow handle'),

-- Brown - Vegetables & Bakery
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Brown (Vegetables)', 'Utensils', 'Chopping Board', 'Vegetable Prep', 'Edward Wills', 'CB-Brown', '2023-01-15', 'Brown', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - Brown (Bakery)', 'Utensils', 'Chopping Board', 'Pastry Section', 'Edward Wills', 'CB-Brown-Bakery', '2023-01-15', 'Brown', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chef Knife - Brown Handle', 'Utensils', 'Knife', 'Vegetable Prep', 'Victorinox', 'CK-Brown', '2023-01-15', 'Brown', 'Sharpen weekly, clean after use', '20cm chef knife with brown handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Serrated Knife - Brown Handle', 'Utensils', 'Knife', 'Pastry Section', 'Victorinox', 'SK-Brown', '2023-01-15', 'Brown', 'Sharpen weekly, clean after use', '25cm serrated knife with brown handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Kitchen Tongs - Brown Handle', 'Utensils', 'Tongs', 'Vegetable Prep', 'OXO', 'KT-Brown', '2023-01-15', 'Brown', 'Clean and sanitize after each use', 'Locking tongs 30cm with brown handle'),

-- White - Bakery/Dairy
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Chopping Board - White (Bakery)', 'Utensils', 'Chopping Board', 'Pastry Section', 'Edward Wills', 'CB-White', '2023-01-15', 'White', 'Clean and sanitize after each use', 'Food-safe HDPE chopping board'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Pastry Knife - White Handle', 'Utensils', 'Knife', 'Pastry Section', 'Victorinox', 'PK-White', '2023-01-15', 'White', 'Sharpen weekly, clean after use', 'Pastry knife with white handle'),
('f99510bc-b290-47c6-8f12-282bea67bd91', 'Bench Scraper - White Handle', 'Utensils', 'Scraper', 'Pastry Section', 'Victorinox', 'BS-White', '2023-01-15', 'White', 'Clean after each use', 'Dough scraper with white handle');

