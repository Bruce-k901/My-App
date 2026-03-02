-- ============================================================================
-- OFFBOARDING / STAFF TERMINATION SYSTEM
-- Adds termination-related columns to profiles and creates checklist table
-- ============================================================================

-- New columns on profiles (some already exist: termination_date, termination_reason,
-- exit_interview_completed, eligible_for_rehire, p45_received, p45_date, p45_reference)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS termination_sub_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS termination_notes text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_working_day date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notice_end_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS termination_initiated_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS termination_initiated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS p45_issued boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS p45_issued_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pilon_applicable boolean DEFAULT false;

-- Offboarding checklist items table
CREATE TABLE IF NOT EXISTS offboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'it_access', 'equipment', 'payroll', 'admin', 'knowledge_transfer', 'compliance'
  )),
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  auto_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_checklist_profile
  ON offboarding_checklist_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_checklist_company
  ON offboarding_checklist_items(company_id);

-- RLS policies for offboarding_checklist_items
ALTER TABLE offboarding_checklist_items ENABLE ROW LEVEL SECURITY;

-- Managers and admins in the same company can read checklist items
CREATE POLICY "Company members can view offboarding checklists"
  ON offboarding_checklist_items FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Managers and admins can insert/update/delete checklist items
CREATE POLICY "Company members can manage offboarding checklists"
  ON offboarding_checklist_items FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );
