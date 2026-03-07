-- Fix bulk_insert_profile: mirror data to BOTH import columns AND UI-facing columns.
-- The UI reads: employee_number, start_date, contracted_hours_per_week,
--   address_line_1, emergency_contacts
-- The import writes: external_employee_id, hire_date, regular_hours_per_week,
--   address, emergency_contact_name/phone
-- This update writes to BOTH so data appears everywhere.

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
DECLARE
  v_trigger_name TEXT;
  v_emergency_contacts JSONB;
BEGIN
  -- Build emergency_contacts JSON array from flat fields
  IF p_emergency_contact_name IS NOT NULL THEN
    v_emergency_contacts := jsonb_build_array(jsonb_build_object(
      'name', COALESCE(p_emergency_contact_name, ''),
      'phone', COALESCE(p_emergency_contact_phone, ''),
      'relationship', '',
      'email', ''
    ));
  ELSE
    v_emergency_contacts := '[]'::jsonb;
  END IF;

  -- Disable messaging_channels triggers that fail for null auth_user_id
  FOR v_trigger_name IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles'
      AND t.tgenabled = 'O'
      AND pg_get_functiondef(p.oid) ILIKE '%messaging_channels%'
  LOOP
    EXECUTE format('ALTER TABLE profiles DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;

  INSERT INTO profiles (
    -- Core
    id, auth_user_id, company_id, email, full_name, phone_number,
    app_role, position_title, site_id, boh_foh, preferred_name,
    date_of_birth, hire_date, employment_type, external_employee_id,
    emergency_contact_name, emergency_contact_phone, address,
    regular_hours_per_week, gender, pronouns,
    status, imported_from, imported_at,
    -- Mirror to UI-facing columns
    employee_number, start_date, contracted_hours_per_week,
    address_line_1, emergency_contacts
  ) VALUES (
    -- Core values
    p_id, NULL, p_company_id, p_email, p_full_name, p_phone_number,
    p_app_role::app_role, p_position_title, p_site_id, p_boh_foh, p_preferred_name,
    p_date_of_birth::date, p_hire_date::date, p_employment_type, p_external_employee_id,
    p_emergency_contact_name, p_emergency_contact_phone, p_address,
    p_regular_hours_per_week, p_gender, p_pronouns,
    'active'::text, 'bulk_upload', p_imported_at,
    -- Mirror values to UI-facing columns
    p_external_employee_id,       -- employee_number
    p_hire_date::date,            -- start_date
    p_regular_hours_per_week,     -- contracted_hours_per_week
    p_address,                    -- address_line_1 (full address as single line)
    v_emergency_contacts          -- emergency_contacts JSON array
  );

  -- Re-enable triggers
  FOR v_trigger_name IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'profiles'
      AND t.tgenabled = 'D'
      AND pg_get_functiondef(p.oid) ILIKE '%messaging_channels%'
  LOOP
    EXECUTE format('ALTER TABLE profiles ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;
END;
$$;

-- Backfill existing bulk-uploaded profiles: copy import columns → UI columns
UPDATE profiles
SET
  employee_number = COALESCE(employee_number, external_employee_id),
  start_date = COALESCE(start_date, hire_date),
  contracted_hours_per_week = COALESCE(contracted_hours_per_week, regular_hours_per_week),
  address_line_1 = COALESCE(address_line_1, address),
  emergency_contacts = CASE
    WHEN (emergency_contacts IS NULL OR emergency_contacts = '[]'::jsonb)
      AND emergency_contact_name IS NOT NULL
    THEN jsonb_build_array(jsonb_build_object(
      'name', COALESCE(emergency_contact_name, ''),
      'phone', COALESCE(emergency_contact_phone, ''),
      'relationship', '',
      'email', ''
    ))
    ELSE emergency_contacts
  END
WHERE imported_from = 'bulk_upload'
  AND (
    (employee_number IS NULL AND external_employee_id IS NOT NULL) OR
    (start_date IS NULL AND hire_date IS NOT NULL) OR
    (contracted_hours_per_week IS NULL AND regular_hours_per_week IS NOT NULL) OR
    (address_line_1 IS NULL AND address IS NOT NULL) OR
    ((emergency_contacts IS NULL OR emergency_contacts = '[]'::jsonb) AND emergency_contact_name IS NOT NULL)
  );
