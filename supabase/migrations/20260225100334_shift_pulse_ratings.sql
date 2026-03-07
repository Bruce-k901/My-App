-- Shift Pulse: staff engagement ratings at clock-out
-- Teamly module feature

CREATE TABLE IF NOT EXISTS shift_pulse_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  shift_id uuid,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  clock_out_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate ratings for the same user within a short window
-- Using a unique index on (user_id, shift_id) when shift_id is present
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_pulse_unique_shift
  ON shift_pulse_ratings (user_id, shift_id) WHERE shift_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shift_pulse_company_site_date
  ON shift_pulse_ratings (company_id, site_id, clock_out_at DESC);

CREATE INDEX IF NOT EXISTS idx_shift_pulse_user
  ON shift_pulse_ratings (user_id, clock_out_at DESC);

-- Row Level Security
ALTER TABLE shift_pulse_ratings ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own ratings
CREATE POLICY "staff_insert_own_rating"
  ON shift_pulse_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Staff can view their own ratings
CREATE POLICY "staff_select_own_ratings"
  ON shift_pulse_ratings FOR SELECT
  USING (user_id = auth.uid());

-- Managers/admins can view all ratings for their company
CREATE POLICY "manager_select_company_ratings"
  ON shift_pulse_ratings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid()
      AND app_role IN ('Admin', 'Owner', 'Manager')
    )
  );

-- No UPDATE or DELETE — ratings are immutable
