-- =====================================================
-- PAT APPLIANCES TABLE - Portable Equipment Only
-- =====================================================
-- Tracks portable electrical appliances for compliance checks
-- Staff verify PAT labels are present and valid
-- =====================================================

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

-- Indexes
CREATE INDEX idx_pat_appliances_site_id ON pat_appliances(site_id);
CREATE INDEX idx_pat_appliances_company_id ON pat_appliances(company_id);
CREATE INDEX idx_pat_appliances_has_label ON pat_appliances(has_current_pat_label);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_pat_appliances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pat_appliances_updated_at
    BEFORE UPDATE ON pat_appliances
    FOR EACH ROW
    EXECUTE FUNCTION update_pat_appliances_updated_at();

-- RLS
ALTER TABLE pat_appliances ENABLE ROW LEVEL SECURITY;

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

-- Grant permissions
GRANT ALL ON pat_appliances TO authenticated;

-- Backfill function - typical portable appliances for commercial kitchen/restaurant
CREATE OR REPLACE FUNCTION backfill_pat_appliances(
    p_site_id UUID,
    p_company_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO pat_appliances (name, brand, company_id, site_id, purchase_date, has_current_pat_label) VALUES
    -- Kitchen appliances
    ('Kettle', 'Russell Hobbs', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true),
    ('Toaster - 4 Slice', 'Dualit', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', true),
    ('Hand Blender', 'Bamix', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', false),
    ('Food Processor', 'Robot Coupe', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '18 months', true),
    ('Stand Mixer', 'KitchenAid', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', true),
    ('Microwave - Small', 'Samsung', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '3 years', false),
    
    -- Coffee/beverage
    ('Coffee Grinder', 'Mazzer', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true),
    ('Milk Frother', 'Aeroccino', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '8 months', true),
    
    -- Display/service equipment
    ('Hot Plate - Display', 'Buffalo', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', true),
    ('Under Counter Fridge', 'Polar', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '3 years', true),
    
    -- Cleaning
    ('Vacuum Cleaner', 'Numatic Henry', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true),
    ('Floor Polisher', 'Numatic', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', false),
    
    -- Office/back of house
    ('Laptop - Manager', 'Dell', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true),
    ('Desktop Computer', 'HP', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', true),
    ('Printer', 'Epson', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '18 months', true),
    ('Label Printer', 'Brother', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true),
    ('Phone Charger Station', 'Anker', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '6 months', true),
    
    -- Misc
    ('Fan Heater', 'DeLonghi', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '3 years', false),
    ('Desk Lamp', 'Anglepoise', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '2 years', true),
    ('Extension Lead - 4 Gang', 'Belkin', p_company_id, p_site_id, CURRENT_DATE - INTERVAL '1 year', true);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Backfill all sites for a company
CREATE OR REPLACE FUNCTION backfill_all_sites_pat_appliances(p_company_id UUID)
RETURNS TABLE (site_name TEXT, appliances_added INTEGER) AS $$
DECLARE
    v_site RECORD;
    v_count INTEGER;
BEGIN
    FOR v_site IN SELECT id, name FROM sites WHERE company_id = p_company_id
    LOOP
        v_count := backfill_pat_appliances(v_site.id, p_company_id);
        site_name := v_site.name;
        appliances_added := v_count;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- View for appliances missing labels
CREATE OR REPLACE VIEW pat_appliances_missing_labels AS
SELECT 
    pa.id,
    pa.name,
    pa.brand,
    s.name as site_name,
    pa.purchase_date,
    pa.notes
FROM pat_appliances pa
JOIN sites s ON pa.site_id = s.id
WHERE pa.has_current_pat_label = false
ORDER BY s.name, pa.name;

GRANT SELECT ON pat_appliances_missing_labels TO authenticated;

