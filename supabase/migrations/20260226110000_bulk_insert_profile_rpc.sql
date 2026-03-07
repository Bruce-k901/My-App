-- Creates an RPC function for bulk-importing profiles.
-- Inserts with session_replication_role='replica' to skip triggers
-- (e.g. messaging_channels trigger that fails when auth_user_id is NULL).
-- SECURITY DEFINER runs as the function owner (postgres) which has superuser.

CREATE OR REPLACE FUNCTION public.bulk_insert_profile(
  p_id UUID,
  p_company_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_app_role TEXT DEFAULT 'Staff',
  p_position_title TEXT DEFAULT NULL,
  p_site_id UUID DEFAULT NULL,
  p_boh_foh TEXT DEFAULT NULL,
  p_preferred_name TEXT DEFAULT NULL,
  p_date_of_birth TEXT DEFAULT NULL,
  p_hire_date TEXT DEFAULT NULL,
  p_employment_type TEXT DEFAULT NULL,
  p_external_employee_id TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_regular_hours_per_week NUMERIC DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_pronouns TEXT DEFAULT NULL,
  p_imported_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disable triggers for this transaction only
  SET LOCAL session_replication_role = 'replica';

  INSERT INTO profiles (
    id, auth_user_id, company_id, email, full_name, phone_number,
    app_role, position_title, site_id, boh_foh, preferred_name,
    date_of_birth, hire_date, employment_type, external_employee_id,
    emergency_contact_name, emergency_contact_phone, address,
    regular_hours_per_week, gender, pronouns,
    status, imported_from, imported_at
  ) VALUES (
    p_id, NULL, p_company_id, p_email, p_full_name, p_phone_number,
    p_app_role, p_position_title, p_site_id, p_boh_foh, p_preferred_name,
    p_date_of_birth, p_hire_date, p_employment_type, p_external_employee_id,
    p_emergency_contact_name, p_emergency_contact_phone, p_address,
    p_regular_hours_per_week, p_gender, p_pronouns,
    'active', 'bulk_upload', p_imported_at
  );

  -- Re-enable triggers
  SET LOCAL session_replication_role = 'origin';
END;
$$;

-- Grant execute to service_role (used by admin client)
GRANT EXECUTE ON FUNCTION public.bulk_insert_profile TO service_role;
