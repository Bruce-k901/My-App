-- Quick setup script for approval hierarchy
-- Run this in Supabase SQL Editor

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(region_id, name)
);

-- Add area_id to sites table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sites' AND column_name = 'area_id'
    ) THEN
        ALTER TABLE sites ADD COLUMN area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create approval workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('rota', 'payroll', 'leave', 'expenses', 'time_off', 'other')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Create approval steps table
CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_role TEXT NOT NULL,
    can_reject BOOLEAN DEFAULT true,
    required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, step_number)
);

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

-- RLS for regions
DROP POLICY IF EXISTS "Users can view regions in their company" ON regions;
CREATE POLICY "Users can view regions in their company"
    ON regions FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage regions" ON regions;
CREATE POLICY "Admins can manage regions"
    ON regions FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND app_role IN ('Admin', 'Owner', 'Super Admin')
        )
    );

-- RLS for areas
DROP POLICY IF EXISTS "Users can view areas in their company" ON areas;
CREATE POLICY "Users can view areas in their company"
    ON areas FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage areas" ON areas;
CREATE POLICY "Admins can manage areas"
    ON areas FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND app_role IN ('Admin', 'Owner', 'Super Admin')
        )
    );

-- RLS for workflows
DROP POLICY IF EXISTS "Users can view workflows" ON approval_workflows;
CREATE POLICY "Users can view workflows"
    ON approval_workflows FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage workflows" ON approval_workflows;
CREATE POLICY "Admins can manage workflows"
    ON approval_workflows FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND app_role IN ('Admin', 'Owner', 'Super Admin')
        )
    );

-- RLS for steps
DROP POLICY IF EXISTS "Users can view steps" ON approval_steps;
CREATE POLICY "Users can view steps"
    ON approval_steps FOR SELECT
    USING (
        workflow_id IN (
            SELECT id FROM approval_workflows 
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Admins can manage steps" ON approval_steps;
CREATE POLICY "Admins can manage steps"
    ON approval_steps FOR ALL
    USING (
        workflow_id IN (
            SELECT id FROM approval_workflows 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE id = auth.uid() 
                AND app_role IN ('Admin', 'Owner', 'Super Admin')
            )
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_regions_company_id ON regions(company_id);
CREATE INDEX IF NOT EXISTS idx_areas_region_id ON areas(region_id);
CREATE INDEX IF NOT EXISTS idx_areas_company_id ON areas(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_area_id ON sites(area_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_company_id ON approval_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON approval_steps(workflow_id);

-- Success message
SELECT 'Approval hierarchy tables created successfully!' AS status;

