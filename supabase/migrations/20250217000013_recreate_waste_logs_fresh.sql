-- ============================================================================
-- Migration: Recreate waste_logs table with Stockly schema
-- Description: Drop old table and create fresh Stockly waste_logs table
-- ============================================================================

BEGIN;

-- Drop old waste_logs table and all dependencies
DROP TABLE IF EXISTS waste_logs CASCADE;

-- Create new Stockly waste_logs table (from migration 20250217000006)
CREATE TABLE waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    
    waste_date DATE NOT NULL,
    waste_reason TEXT NOT NULL CHECK (waste_reason IN (
        'expired', 'damaged', 'spillage', 'overproduction', 
        'quality', 'customer_return', 'temperature_breach', 
        'pest_damage', 'theft', 'prep_waste', 'other'
    )),
    
    notes TEXT,
    photo_urls TEXT[],
    total_cost DECIMAL(10,2),
    
    -- Link to Checkly if from temperature breach
    checkly_task_id UUID,
    
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_waste_logs_company ON waste_logs(company_id);
CREATE INDEX idx_waste_logs_site ON waste_logs(site_id);
CREATE INDEX idx_waste_logs_date ON waste_logs(waste_date DESC);
CREATE INDEX idx_waste_logs_reason ON waste_logs(waste_reason);

-- Create waste_log_lines table (from migration 20250217000006)
CREATE TABLE IF NOT EXISTS waste_log_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_log_id UUID NOT NULL REFERENCES waste_logs(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),
    
    specific_reason TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_waste_lines_log ON waste_log_lines(waste_log_id);

-- Enable RLS
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_log_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (recreate since we dropped the table)
DO $$
BEGIN
    -- Only create policies if stockly_company_access function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'stockly_company_access'
    ) THEN
        -- Company-scoped policy for waste_logs
        DROP POLICY IF EXISTS waste_logs_company ON waste_logs;
        CREATE POLICY waste_logs_company ON waste_logs FOR ALL 
            USING (stockly_company_access(company_id));
        
        -- Child table policy for waste_log_lines
        DROP POLICY IF EXISTS waste_lines_parent ON waste_log_lines;
        CREATE POLICY waste_lines_parent ON waste_log_lines FOR ALL USING (
            EXISTS (
                SELECT 1 FROM waste_logs wl
                WHERE wl.id = waste_log_lines.waste_log_id
                  AND stockly_company_access(wl.company_id)
            )
        );
    END IF;
END $$;

COMMIT;

