-- =====================================================
-- Create PAT Appliances Table & Backfill All Sites
-- =====================================================
-- This script:
-- 1. Creates the pat_appliances table (if it doesn't exist)
-- 2. Sets up indexes, triggers, and RLS policies
-- 3. Backfills all sites with 20 typical portable appliances
-- =====================================================

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS pat_appliances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic appliance info
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    
    -- Links to existing tables
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    
    -- Tracking
    purchase_date DATE,
    has_current_pat_label BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pat_appliances_site_id ON pat_appliances(site_id);
CREATE INDEX IF NOT EXISTS idx_pat_appliances_company_id ON pat_appliances(company_id);
CREATE INDEX IF NOT EXISTS idx_pat_appliances_has_label ON pat_appliances(has_current_pat_label);

-- Step 3: Create trigger function for auto-update timestamp
CREATE OR REPLACE FUNCTION update_pat_appliances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_pat_appliances_updated_at ON pat_appliances;
CREATE TRIGGER trg_pat_appliances_updated_at
    BEFORE UPDATE ON pat_appliances
    FOR EACH ROW
    EXECUTE FUNCTION update_pat_appliances_updated_at();

-- Step 5: Enable RLS
ALTER TABLE pat_appliances ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS pat_appliances_select_policy ON pat_appliances;
DROP POLICY IF EXISTS pat_appliances_insert_policy ON pat_appliances;
DROP POLICY IF EXISTS pat_appliances_update_policy ON pat_appliances;
DROP POLICY IF EXISTS pat_appliances_delete_policy ON pat_appliances;

CREATE POLICY pat_appliances_select_policy ON pat_appliances
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY pat_appliances_insert_policy ON pat_appliances
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY pat_appliances_update_policy ON pat_appliances
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY pat_appliances_delete_policy ON pat_appliances
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Step 7: Grant permissions
GRANT ALL ON pat_appliances TO authenticated;

-- Step 8: Backfill all sites with appliances
DO $$
DECLARE
    v_site RECORD;
    v_count INTEGER;
    v_total_appliances INTEGER := 0;
    v_total_sites INTEGER := 0;
BEGIN
    RAISE NOTICE '✅ Table created/verified. Starting backfill...';
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
    RAISE NOTICE '✅ Complete!';
    RAISE NOTICE '   Total sites processed: %', v_total_sites;
    RAISE NOTICE '   Total appliances added: %', v_total_appliances;
    RAISE NOTICE '   Average appliances per site: %', CASE WHEN v_total_sites > 0 THEN ROUND(v_total_appliances::DECIMAL / v_total_sites, 2) ELSE 0 END;
END $$;

