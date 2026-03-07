-- Add new columns to profiles for HR import data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS external_employee_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS regular_hours_per_week numeric(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS imported_from text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- Audit log for bulk upload operations
CREATE TABLE IF NOT EXISTS bulk_upload_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  module text NOT NULL DEFAULT 'teamly',
  file_name text NOT NULL,
  file_size_bytes integer,
  total_rows integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  column_mapping jsonb,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bulk_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view their upload logs"
  ON bulk_upload_logs FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins and managers can insert upload logs"
  ON bulk_upload_logs FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles
    WHERE auth_user_id = auth.uid()
    AND app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
  ));
