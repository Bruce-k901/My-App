-- ============================================================================
-- Migration: Order Book Sample Test Data
-- Description: Creates realistic bakery scenario: Okja Bakery (supplier),
--              5 test customers, 15 products, standing orders, production profiles
-- Note: Requires companies and profiles tables to exist
-- ============================================================================

DO $$
DECLARE
  okja_company_id UUID;
  okja_supplier_id UUID;
  customer1_id UUID;
  customer2_id UUID;
  croissant_product_id UUID;
  almond_croissant_product_id UUID;
  pain_au_chocolat_product_id UUID;
  croissant_profile_id UUID;
  almond_croissant_profile_id UUID;
BEGIN
  -- Only run if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    
    -- ============================================================================
    -- CREATE OKJA BAKERY (Supplier Company)
    -- ============================================================================
    -- First, check if we need to create a company or use existing
    -- For testing, we'll create if it doesn't exist, or use first company
    SELECT id INTO okja_company_id FROM public.companies LIMIT 1;
    
    IF okja_company_id IS NULL THEN
      -- Create test company (if no companies exist)
      INSERT INTO public.companies (name, created_at, updated_at)
      VALUES ('Okja Bakery Ltd', NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id INTO okja_company_id;
    END IF;
    
    -- Get or create Okja Bakery supplier record
    INSERT INTO public.order_book_suppliers (
      company_id,
      business_name,
      trading_name,
      contact_name,
      email,
      phone,
      address_line1,
      city,
      postcode,
      country,
      latitude,
      longitude,
      delivery_radius_km,
      delivery_days,
      order_cutoff_time,
      order_cutoff_days,
      payment_terms_days,
      minimum_order_value,
      is_active,
      is_approved
    )
    VALUES (
      okja_company_id,
      'Okja Bakery',
      'Okja Bakery',
      'Sarah Kim',
      'sarah@okjabakery.com',
      '+44 20 7123 4567',
      '123 Bread Street',
      'London',
      'SW1A 1AA',
      'UK',
      51.5074,  -- London coordinates
      -0.1278,
      50.00,
      ARRAY['tuesday', 'friday']::TEXT[],
      '14:00'::TIME,
      1,
      30,
      50.00,
      TRUE,
      TRUE
    )
    ON CONFLICT (company_id, business_name) DO UPDATE SET
      trading_name = EXCLUDED.trading_name,
      updated_at = NOW()
    RETURNING id INTO okja_supplier_id;
    
    -- ============================================================================
    -- CREATE OKJA CUSTOMERS (Full Customer List)
    -- ============================================================================
    
    INSERT INTO public.order_book_customers (
      company_id,
      supplier_id,
      business_name,
      contact_name,
      email,
      phone,
      address_line1,
      city,
      postcode,
      country,
      latitude,
      longitude,
      status,
      approved_at
    )
    VALUES
      (okja_company_id, okja_supplier_id, 'High Grade', 'Stevie', 'accounts@highgrade.coffee', NULL, '91 Brick Lane', 'London', 'E1 6QL', 'UK', 51.5207, -0.0738, 'active', NOW()),
      (okja_company_id, okja_supplier_id, '3rd Culture', 'Tilen', 'hi@thirdculturedeli.com', NULL, '29 Broadway Market', 'London', 'E8 4PH', 'UK', 51.5417, -0.0569, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Photo Book', 'Emma/Farika', NULL, NULL, 'Petticote Lane', 'London', 'E2 8BH', 'UK', 51.5287, -0.0598, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Mandala Cafe', 'Ben', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Alchemy', 'Rachel', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Gecko', 'Andrew', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Bean', 'Niki', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Alchemy St Paul''s', 'Max', NULL, NULL, NULL, 'London', 'EC4M 8AD', 'UK', 51.5136, -0.0986, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Kleinskys', 'Sophie', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'De Beauvoir Deli', 'Gareth', NULL, NULL, NULL, 'London', 'N1 5QL', 'UK', 51.5403, -0.0754, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Alchemy 2', 'Greg', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Unity Diner', 'Greg', 'greg@unitydiner.com', NULL, 'Petticote Lane', 'London', 'E2 8BH', 'UK', 51.5287, -0.0598, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Tram Store', 'Guido', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Chaos', 'Kali', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'The Sanctuary', 'Giorgia/Stuart', NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Naked Deptford', 'Vic', NULL, NULL, NULL, 'London', 'SE8 4RJ', 'UK', 51.4816, -0.0278, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Naked Greenwich', NULL, NULL, NULL, NULL, 'London', 'SE10 9HZ', 'UK', 51.4825, 0.0077, 'active', NOW()),
      (okja_company_id, okja_supplier_id, 'Plant Shack', NULL, NULL, NULL, NULL, 'London', NULL, 'UK', 51.5074, -0.1278, 'active', NOW())
    ON CONFLICT (supplier_id, business_name) DO NOTHING;
    
    -- Get customer IDs for customers used in standing orders (High Grade and Unity Diner)
    SELECT id INTO customer1_id FROM public.order_book_customers WHERE supplier_id = okja_supplier_id AND business_name = 'High Grade' LIMIT 1;
    SELECT id INTO customer2_id FROM public.order_book_customers WHERE supplier_id = okja_supplier_id AND business_name = 'Unity Diner' LIMIT 1;
    
    -- ============================================================================
    -- CREATE PRODUCTS (Full Okja Product List)
    -- ============================================================================
    
    -- Pastries
    INSERT INTO public.order_book_products (supplier_id, name, description, sku, category, base_price, unit, is_active, is_available)
    VALUES
      (okja_supplier_id, 'Croissant', 'Classic French butter croissant', 'OKJA-CROI-001', 'Pastries', 1.80, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Morning Bun', 'Cinnamon sugar morning bun', 'OKJA-MORB-001', 'Pastries', 2.20, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Pan a Choc', 'Chocolate-filled French pastry', 'OKJA-PACH-001', 'Pastries', 2.20, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Almond Croissant', 'Butter croissant filled with almond cream', 'OKJA-ALMC-001', 'Pastries', 2.40, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Red Pesto Bun', 'Savory bun with red pesto', 'OKJA-RPES-001', 'Pastries', 2.50, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Chives Bun', 'Soft bun with chives', 'OKJA-CHIV-001', 'Pastries', 2.30, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Garlic Bun', 'Savory garlic-infused bun', 'OKJA-GARL-001', 'Pastries', 2.30, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Pistachio Swirl', 'Sweet pastry with pistachio swirl', 'OKJA-PIST-001', 'Pastries', 2.60, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Choc Hazel Swirl', 'Chocolate and hazelnut swirl pastry', 'OKJA-CHAZ-001', 'Pastries', 2.60, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Cina Swirl', 'Cinnamon swirl pastry', 'OKJA-CINA-001', 'Pastries', 2.40, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Lemon Poppy', 'Lemon and poppy seed pastry', 'OKJA-LEMP-001', 'Pastries', 2.40, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Mince Pie', 'Traditional mince pie', 'OKJA-MINC-001', 'Pastries', 2.50, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Monkey Bread', 'Sweet pull-apart monkey bread', 'OKJA-MONK-001', 'Pastries', 3.50, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Sausage Skrol', 'Savory sausage scroll', 'OKJA-SASK-001', 'Pastries', 2.80, 'each', TRUE, TRUE)
    ON CONFLICT (supplier_id, name) DO NOTHING;
    
    -- Cookies
    INSERT INTO public.order_book_products (supplier_id, name, description, sku, category, base_price, unit, is_active, is_available)
    VALUES
      (okja_supplier_id, 'Almond Cookie', 'Crisp almond cookie', 'OKJA-ALCO-001', 'Cookies', 1.80, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Choc Hazelnut', 'Chocolate hazelnut cookie', 'OKJA-CHHN-001', 'Cookies', 2.00, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Choc Pecan', 'Chocolate pecan cookie', 'OKJA-CHPC-001', 'Cookies', 2.00, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Choc Cookie', 'Classic chocolate chip cookie', 'OKJA-CHOC-001', 'Cookies', 1.80, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Oatmeal Raisin', 'Oatmeal raisin cookie', 'OKJA-OATR-001', 'Cookies', 1.80, 'each', TRUE, TRUE),
      (okja_supplier_id, 'Gingerbread Man', 'Spiced gingerbread cookie', 'OKJA-GING-001', 'Cookies', 2.20, 'each', TRUE, TRUE)
    ON CONFLICT (supplier_id, name) DO NOTHING;
    
    -- Get product IDs for products used in production profiles (if they already exist)
    IF croissant_product_id IS NULL THEN
      SELECT id INTO croissant_product_id FROM public.order_book_products WHERE supplier_id = okja_supplier_id AND name = 'Croissant';
    END IF;
    IF almond_croissant_product_id IS NULL THEN
      SELECT id INTO almond_croissant_product_id FROM public.order_book_products WHERE supplier_id = okja_supplier_id AND name = 'Almond Croissant';
    END IF;
    IF pain_au_chocolat_product_id IS NULL THEN
      SELECT id INTO pain_au_chocolat_product_id FROM public.order_book_products WHERE supplier_id = okja_supplier_id AND name = 'Pan a Choc';
    END IF;
    
    -- ============================================================================
    -- CREATE PRODUCTION PROFILES (for 5 core products)
    -- ============================================================================
    
    -- Croissant Production Profile
    INSERT INTO public.order_book_production_profiles (
      supplier_id,
      product_id,
      prep_lead_time_hours,
      bake_time_minutes,
      cool_time_minutes,
      total_production_time_minutes,
      batch_size,
      batch_yield,
      equipment_requirements,
      storage_type,
      storage_space_per_unit
    )
    VALUES (
      okja_supplier_id,
      croissant_product_id,
      18,  -- Prep 18 hours before (overnight)
      15,  -- 15 minutes bake time
      30,  -- 30 minutes cool time
      60,  -- Total 60 minutes active time
      50,  -- 50 croissants per batch
      50,  -- 100% yield
      '[{"equipment_id": null, "equipment_name": "Oven 1", "duration_minutes": 15, "capacity_percent": 80}]'::JSONB,
      'ambient',
      0.001  -- 0.001 cubic meters per croissant
    )
    ON CONFLICT (supplier_id, product_id) DO NOTHING
    RETURNING id INTO croissant_profile_id;
    
    -- Almond Croissant Production Profile
    INSERT INTO public.order_book_production_profiles (
      supplier_id,
      product_id,
      prep_lead_time_hours,
      bake_time_minutes,
      cool_time_minutes,
      total_production_time_minutes,
      batch_size,
      batch_yield,
      equipment_requirements,
      storage_type,
      storage_space_per_unit
    )
    VALUES (
      okja_supplier_id,
      almond_croissant_product_id,
      18,
      18,  -- Slightly longer bake
      30,
      65,
      30,  -- Smaller batch
      30,
      '[{"equipment_id": null, "equipment_name": "Oven 1", "duration_minutes": 18, "capacity_percent": 70}]'::JSONB,
      'ambient',
      0.0012
    )
    ON CONFLICT (supplier_id, product_id) DO NOTHING
    RETURNING id INTO almond_croissant_profile_id;
    
    -- Get profile IDs if they already exist
    IF croissant_profile_id IS NULL THEN
      SELECT id INTO croissant_profile_id FROM public.order_book_production_profiles WHERE supplier_id = okja_supplier_id AND product_id = croissant_product_id;
    END IF;
    IF almond_croissant_profile_id IS NULL THEN
      SELECT id INTO almond_croissant_profile_id FROM public.order_book_production_profiles WHERE supplier_id = okja_supplier_id AND product_id = almond_croissant_product_id;
    END IF;
    
    -- ============================================================================
    -- CREATE PRODUCT COMPONENTS (Bill of Materials)
    -- ============================================================================
    
    -- Croissant Ingredients (if profile exists)
    IF croissant_profile_id IS NOT NULL THEN
      INSERT INTO public.order_book_product_components (production_profile_id, ingredient_name, quantity_per_unit, unit)
      VALUES
        (croissant_profile_id, 'Flour', 0.05, 'kg'),
        (croissant_profile_id, 'Butter', 0.025, 'kg'),
        (croissant_profile_id, 'Yeast', 0.002, 'kg'),
        (croissant_profile_id, 'Sugar', 0.005, 'kg'),
        (croissant_profile_id, 'Salt', 0.0005, 'kg')
      ON CONFLICT (production_profile_id, ingredient_name) DO NOTHING;
    END IF;
    
    -- Almond Croissant Ingredients
    IF almond_croissant_profile_id IS NOT NULL THEN
      INSERT INTO public.order_book_product_components (production_profile_id, ingredient_name, quantity_per_unit, unit)
      VALUES
        (almond_croissant_profile_id, 'Flour', 0.05, 'kg'),
        (almond_croissant_profile_id, 'Butter', 0.025, 'kg'),
        (almond_croissant_profile_id, 'Almond paste', 0.015, 'kg'),
        (almond_croissant_profile_id, 'Sliced almonds', 0.005, 'kg'),
        (almond_croissant_profile_id, 'Sugar', 0.008, 'kg')
      ON CONFLICT (production_profile_id, ingredient_name) DO NOTHING;
    END IF;
    
    -- ============================================================================
    -- CREATE EQUIPMENT
    -- ============================================================================
    INSERT INTO public.order_book_equipment (
      supplier_id,
      name,
      equipment_type,
      capacity_units,
      capacity_percent_max,
      available_from,
      available_until,
      is_active
    )
    VALUES
      (okja_supplier_id, 'Oven 1', 'oven', 50, 95, '04:00'::TIME, '20:00'::TIME, TRUE),
      (okja_supplier_id, 'Oven 2', 'oven', 50, 95, '04:00'::TIME, '20:00'::TIME, TRUE),
      (okja_supplier_id, 'Fridge 1', 'fridge', 1000, 90, '00:00'::TIME, '23:59'::TIME, TRUE),
      (okja_supplier_id, 'Mixer 1', 'mixer', 50, 80, '06:00'::TIME, '18:00'::TIME, TRUE)
    ON CONFLICT (supplier_id, name) DO NOTHING;
    
    -- ============================================================================
    -- CREATE STANDING ORDERS
    -- ============================================================================
    
    -- High Grade Cafe: Every Tuesday & Friday
    IF customer1_id IS NOT NULL THEN
      INSERT INTO public.order_book_standing_orders (
        supplier_id,
        customer_id,
        delivery_days,
        start_date,
        items,
        is_active
      )
      VALUES (
        okja_supplier_id,
        customer1_id,
        ARRAY['tuesday', 'friday']::TEXT[],
        CURRENT_DATE,
        jsonb_build_array(
          jsonb_build_object('product_id', croissant_product_id, 'quantity', 12),
          jsonb_build_object('product_id', almond_croissant_product_id, 'quantity', 6),
          jsonb_build_object('product_id', pain_au_chocolat_product_id, 'quantity', 8)
        ),
        TRUE
      )
      ON CONFLICT (supplier_id, customer_id) DO NOTHING;
    END IF;
    
    -- Unity Diner: Every Tuesday
    IF customer2_id IS NOT NULL THEN
      INSERT INTO public.order_book_standing_orders (
        supplier_id,
        customer_id,
        delivery_days,
        start_date,
        items,
        is_active
      )
      VALUES (
        okja_supplier_id,
        customer2_id,
        ARRAY['tuesday']::TEXT[],
        CURRENT_DATE,
        jsonb_build_array(
          jsonb_build_object('product_id', croissant_product_id, 'quantity', 20),
          jsonb_build_object('product_id', almond_croissant_product_id, 'quantity', 10)
        ),
        TRUE
      )
      ON CONFLICT (supplier_id, customer_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Order Book sample data created successfully';
    RAISE NOTICE 'Supplier ID: %', okja_supplier_id;
    RAISE NOTICE 'Sample customers created: High Grade, Unity Diner, and 16 others';
    
  ELSE
    RAISE NOTICE '⚠️ companies table does not exist - skipping Order Book sample data creation';
  END IF;
END $$;

