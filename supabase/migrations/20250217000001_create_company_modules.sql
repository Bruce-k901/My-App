-- ============================================================================
-- Migration: Create Company Modules Table
-- Description: Track which modules each company has enabled (checkly, stockly, peoply)
-- ============================================================================

BEGIN;

-- Track which modules each company has enabled
CREATE TABLE IF NOT EXISTS company_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN ('checkly', 'stockly', 'peoply')),
    is_enabled BOOLEAN DEFAULT TRUE,
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, module)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_company ON company_modules(company_id);

-- Enable RLS
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_modules_access ON company_modules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_modules.company_id
        )
    );

-- Seed existing companies with Checkly module
INSERT INTO company_modules (company_id, module, is_enabled)
SELECT id, 'checkly', TRUE FROM companies
ON CONFLICT (company_id, module) DO NOTHING;

COMMIT;

