-- POS Employee Mappings: link Square team member IDs to Teamly profile IDs
-- Used by the labor/timecard sync to route POS clock-in/out to the correct employee

CREATE TABLE IF NOT EXISTS pos_employee_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  pos_provider TEXT NOT NULL DEFAULT 'square',
  pos_team_member_id TEXT NOT NULL,
  pos_team_member_name TEXT,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  match_method TEXT DEFAULT 'unmatched',  -- 'auto_name' | 'manual' | 'unmatched'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, pos_provider, pos_team_member_id)
);

-- RLS policies (same pattern as pos_product_mappings)
ALTER TABLE pos_employee_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company employee mappings"
  ON pos_employee_mappings FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

CREATE POLICY "Admins can manage employee mappings"
  ON pos_employee_mappings FOR ALL
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

-- Index for fast lookups during sync
CREATE INDEX IF NOT EXISTS idx_pos_employee_mappings_company_provider
  ON pos_employee_mappings(company_id, pos_provider);
