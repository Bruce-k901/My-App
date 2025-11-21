-- ============================================================================
-- STEP 2: CREATE SITE_CHECKLISTS TABLE (My Tasks Storage)
-- ============================================================================

DROP TABLE IF EXISTS site_checklists CASCADE;

CREATE TABLE site_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'annually', 'triggered')),
  active BOOLEAN DEFAULT true,
  
  -- Multi-time configuration (for SFBB temp checks)
  daypart_times JSONB, -- {"before_open": ["07:00"], "during_service": ["12:00"], "after_service": ["17:00"]}
  
  -- Equipment configuration (for temp checks)
  equipment_config JSONB, -- [{"assetId": "uuid", "equipment": "Fridge", "nickname": "F1"}]
  
  -- Scheduling (for weekly/monthly/annual)
  days_of_week INTEGER[], -- [1,2,3,4,5] for weekly
  date_of_month INTEGER, -- 1-31 for monthly
  anniversary_date DATE, -- for annual
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE(site_id, template_id)
);

-- Indexes
CREATE INDEX idx_site_checklists_site ON site_checklists(site_id);
CREATE INDEX idx_site_checklists_active ON site_checklists(active) WHERE active = true;
CREATE INDEX idx_site_checklists_frequency ON site_checklists(frequency);
CREATE INDEX idx_site_checklists_template ON site_checklists(template_id);

-- RLS Policies
ALTER TABLE site_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view site_checklists for their site or all if Owner/Admin"
ON site_checklists FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.app_role IN ('Owner', 'Admin')
      OR profiles.site_id = site_checklists.site_id
    )
  )
);

CREATE POLICY "Users insert site_checklists for their site"
ON site_checklists FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND site_id = site_checklists.site_id
  )
);

CREATE POLICY "Users update site_checklists for their site"
ON site_checklists FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.app_role IN ('Owner', 'Admin')
      OR profiles.site_id = site_checklists.site_id
    )
  )
);

CREATE POLICY "Users delete site_checklists for their site"
ON site_checklists FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.app_role IN ('Owner', 'Admin')
      OR profiles.site_id = site_checklists.site_id
    )
  )
);

-- Trigger to auto-set site_id and company_id
CREATE OR REPLACE FUNCTION set_site_checklist_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.site_id IS NULL THEN
    SELECT site_id INTO NEW.site_id FROM profiles WHERE id = auth.uid();
  END IF;
  
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM profiles WHERE id = auth.uid();
  END IF;
  
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_set_site_checklist_defaults
  BEFORE INSERT OR UPDATE ON site_checklists
  FOR EACH ROW
  EXECUTE FUNCTION set_site_checklist_defaults();

