-- Onboarding progress tracking table
-- Persists per-step completion status so admins and users can track setup progress

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  step_id       text NOT NULL,
  section       text NOT NULL CHECK (section IN ('core','checkly','stockly','teamly','assetly','planly')),
  status        text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete','skipped')),
  completed_at  timestamptz,
  completed_by  uuid REFERENCES profiles(id),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(company_id, step_id)
);

-- Add setup_complete flag to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false;

-- RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Company members can read their own company's progress
CREATE POLICY "company_members_can_read_onboarding_progress"
  ON onboarding_progress
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin/Owner/Manager can insert progress rows for their company
CREATE POLICY "company_admins_can_insert_onboarding_progress"
  ON onboarding_progress
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
        AND app_role IN ('Admin', 'Owner', 'General Manager', 'Manager')
    )
  );

-- Admin/Owner/Manager can update progress rows for their company
CREATE POLICY "company_admins_can_update_onboarding_progress"
  ON onboarding_progress
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
        AND app_role IN ('Admin', 'Owner', 'General Manager', 'Manager')
    )
  );

-- Index for fast lookups by company
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id
  ON onboarding_progress(company_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_updated_at();
