-- =====================================================
-- Backfill PAT Appliances for All Sites
-- =====================================================
-- This script adds 20 typical portable appliances to all sites
-- for all companies in the database
--
-- ⚠️  IMPORTANT: You MUST run the table creation migration first!
--    File: supabase/migrations/20250130000003_create_pat_appliances_table.sql
--
--    You can either:
--    1. Run: npx supabase migration up (if using Supabase CLI)
--    2. Or copy/paste the migration SQL directly into Supabase SQL editor
-- =====================================================

DO $$
DECLARE
    v_site RECORD;
    v_count INTEGER;
    v_total_appliances INTEGER := 0;
    v_total_sites INTEGER := 0;
    v_table_exists BOOLEAN;
BEGIN
    -- Check if pat_appliances table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pat_appliances'
    ) INTO v_table_exists;
    
    IF NOT v_table_exists THEN
        RAISE EXCEPTION '❌ ERROR: pat_appliances table does not exist. Please run the migration 20250130000003_create_pat_appliances_table.sql first!';
    END IF;
    
    RAISE NOTICE '✅ pat_appliances table found. Starting backfill...';
    RAISE NOTICE '';
    
    -- Loop through all sites
    FOR v_site IN 
        SELECT s.id as site_id, s.company_id, s.name as site_name, c.name as company_name
        FROM sites s
        JOIN companies c ON s.company_id = c.id
        ORDER BY c.name, s.name
    LOOP
        -- Check if appliances already exist for this site
        SELECT COUNT(*) INTO v_count
        FROM pat_appliances
        WHERE site_id = v_site.site_id;
        
        -- Only backfill if site has no appliances yet
        IF v_count = 0 THEN
            -- Insert 20 typical portable appliances
            INSERT INTO pat_appliances (name, brand, company_id, site_id, purchase_date, has_current_pat_label) VALUES
            -- Kitchen appliances
            ('Kettle', 'Russell Hobbs', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true),
            ('Toaster - 4 Slice', 'Dualit', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', true),
            ('Hand Blender', 'Bamix', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', false),
            ('Food Processor', 'Robot Coupe', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '18 months', true),
            ('Stand Mixer', 'KitchenAid', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', true),
            ('Microwave - Small', 'Samsung', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '3 years', false),
            
            -- Coffee/beverage
            ('Coffee Grinder', 'Mazzer', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true),
            ('Milk Frother', 'Aeroccino', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '8 months', true),
            
            -- Display/service equipment
            ('Hot Plate - Display', 'Buffalo', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', true),
            ('Under Counter Fridge', 'Polar', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '3 years', true),
            
            -- Cleaning
            ('Vacuum Cleaner', 'Numatic Henry', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true),
            ('Floor Polisher', 'Numatic', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', false),
            
            -- Office/back of house
            ('Laptop - Manager', 'Dell', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true),
            ('Desktop Computer', 'HP', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', true),
            ('Printer', 'Epson', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '18 months', true),
            ('Label Printer', 'Brother', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true),
            ('Phone Charger Station', 'Anker', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '6 months', true),
            
            -- Misc
            ('Fan Heater', 'DeLonghi', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '3 years', false),
            ('Desk Lamp', 'Anglepoise', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '2 years', true),
            ('Extension Lead - 4 Gang', 'Belkin', v_site.company_id, v_site.site_id, CURRENT_DATE - INTERVAL '1 year', true);
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            v_total_appliances := v_total_appliances + v_count;
            v_total_sites := v_total_sites + 1;
            
            RAISE NOTICE '✅ Added % appliances to site: % (Company: %)', v_count, v_site.site_name, v_site.company_name;
        ELSE
            RAISE NOTICE '⏭️  Skipped site: % (Company: %) - already has % appliances', v_site.site_name, v_site.company_name, v_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Backfill complete!';
    RAISE NOTICE '   Total sites processed: %', v_total_sites;
    RAISE NOTICE '   Total appliances added: %', v_total_appliances;
    RAISE NOTICE '   Average appliances per site: %', CASE WHEN v_total_sites > 0 THEN ROUND(v_total_appliances::DECIMAL / v_total_sites, 2) ELSE 0 END;
END $$;

