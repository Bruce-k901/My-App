-- Simple RPC function to insert contractors that bypasses PostgREST schema cache
-- This will definitely save contact_name, address, and category

-- Drop existing functions first to allow return type changes
-- Use CASCADE to drop all overloads and dependencies
DROP FUNCTION IF EXISTS public.insert_contractor_simple CASCADE;
DROP FUNCTION IF EXISTS public.update_contractor_simple CASCADE;

CREATE OR REPLACE FUNCTION public.insert_contractor_simple(
  p_company_id uuid,
  p_name text,
  p_category text,
  p_contact_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_ooh_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_callout_fee numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_site_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_is_active boolean DEFAULT true,
  p_contract_start date DEFAULT NULL,
  p_contract_expiry date DEFAULT NULL,
  p_contract_file text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  contact_name text,
  email text,
  phone text,
  ooh_phone text,
  address text,
  category text,
  postcode text,
  region text,
  website text,
  hourly_rate numeric,
  callout_fee numeric,
  notes text,
  site_id uuid,
  type text,
  status text,
  is_active boolean,
  contract_start date,
  contract_expiry date,
  contract_file text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id uuid;
BEGIN
  -- Insert directly into contractors table
  -- Convert empty strings to NULL for nullable fields
  -- SECURITY DEFINER runs with function owner's privileges, bypassing RLS
  INSERT INTO public.contractors (
    company_id,
    name,
    contact_name,
    email,
    phone,
    ooh_phone,
    ooh,
    address,
    category,
    postcode,
    region,
    website,
    hourly_rate,
    callout_fee,
    notes,
    site_id,
    type,
    status,
    is_active,
    contract_start,
    contract_expiry,
    contract_file,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    p_name,
    CASE WHEN p_contact_name IS NULL OR TRIM(p_contact_name) = '' THEN NULL ELSE TRIM(p_contact_name) END,
    CASE WHEN p_email IS NULL OR TRIM(p_email) = '' THEN NULL ELSE TRIM(p_email) END,
    CASE WHEN p_phone IS NULL OR TRIM(p_phone) = '' THEN NULL ELSE TRIM(p_phone) END,
    CASE WHEN p_ooh_phone IS NULL OR TRIM(p_ooh_phone) = '' THEN NULL ELSE TRIM(p_ooh_phone) END,
    CASE WHEN p_ooh_phone IS NULL OR TRIM(p_ooh_phone) = '' THEN NULL ELSE TRIM(p_ooh_phone) END, -- Also set ooh for compatibility
    CASE WHEN p_address IS NULL OR TRIM(p_address) = '' THEN NULL ELSE TRIM(p_address) END,
    COALESCE(NULLIF(TRIM(p_category), ''), ''), -- Category is NOT NULL, default to empty string
    CASE WHEN p_postcode IS NULL OR TRIM(p_postcode) = '' THEN NULL ELSE TRIM(p_postcode) END,
    CASE WHEN p_region IS NULL OR TRIM(p_region) = '' THEN NULL ELSE TRIM(p_region) END,
    CASE WHEN p_website IS NULL OR TRIM(p_website) = '' THEN NULL ELSE TRIM(p_website) END,
    p_hourly_rate,
    p_callout_fee,
    CASE WHEN p_notes IS NULL OR TRIM(p_notes) = '' THEN NULL ELSE TRIM(p_notes) END,
    p_site_id,
    CASE WHEN p_type IS NULL OR TRIM(p_type) = '' THEN NULL ELSE TRIM(p_type) END,
    COALESCE(NULLIF(TRIM(p_status), ''), 'active'),
    COALESCE(p_is_active, true),
    p_contract_start,
    p_contract_expiry,
    CASE WHEN p_contract_file IS NULL OR TRIM(p_contract_file) = '' THEN NULL ELSE TRIM(p_contract_file) END,
    NOW(),
    NOW()
  )
  RETURNING contractors.id INTO v_inserted_id;
  
  -- Return the inserted row
  RETURN QUERY
  SELECT 
    c.id,
    c.company_id,
    c.name,
    c.contact_name,
    c.email,
    c.phone,
    c.ooh_phone,
    c.address,
    c.category,
    c.postcode,
    c.region,
    c.website,
    c.hourly_rate,
    c.callout_fee,
    c.notes,
    c.site_id,
    c.type,
    c.status,
    c.is_active,
    c.contract_start,
    c.contract_expiry,
    c.contract_file,
    c.created_at,
    c.updated_at
  FROM public.contractors c
  WHERE c.id = v_inserted_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_contractor_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_contractor_simple TO service_role;

-- Ensure the function owner has proper permissions
ALTER FUNCTION public.insert_contractor_simple OWNER TO postgres;

-- Create update function
CREATE OR REPLACE FUNCTION public.update_contractor_simple(
  p_id uuid,
  p_company_id uuid,
  p_name text,
  p_category text,
  p_contact_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_ooh_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_callout_fee numeric DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_site_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_is_active boolean DEFAULT true,
  p_contract_start date DEFAULT NULL,
  p_contract_expiry date DEFAULT NULL,
  p_contract_file text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  contact_name text,
  email text,
  phone text,
  ooh_phone text,
  address text,
  category text,
  postcode text,
  region text,
  website text,
  hourly_rate numeric,
  callout_fee numeric,
  notes text,
  site_id uuid,
  type text,
  status text,
  is_active boolean,
  contract_start date,
  contract_expiry date,
  contract_file text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated integer;
  v_exists boolean;
BEGIN
  -- First, verify the contractor exists
  SELECT EXISTS(
    SELECT 1 FROM public.contractors c
    WHERE c.id = p_id AND c.company_id = p_company_id
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Contractor with id % and company_id % not found', p_id, p_company_id;
  END IF;
  
  -- Update contractors table
  -- Convert empty strings to NULL for nullable fields
  -- SECURITY DEFINER runs with function owner's privileges, bypassing RLS
  UPDATE public.contractors c
  SET
    name = p_name,
    contact_name = CASE WHEN p_contact_name IS NULL OR TRIM(p_contact_name) = '' THEN NULL ELSE TRIM(p_contact_name) END,
    email = CASE WHEN p_email IS NULL OR TRIM(p_email) = '' THEN NULL ELSE TRIM(p_email) END,
    phone = CASE WHEN p_phone IS NULL OR TRIM(p_phone) = '' THEN NULL ELSE TRIM(p_phone) END,
    ooh_phone = CASE WHEN p_ooh_phone IS NULL OR TRIM(p_ooh_phone) = '' THEN NULL ELSE TRIM(p_ooh_phone) END,
    ooh = CASE WHEN p_ooh_phone IS NULL OR TRIM(p_ooh_phone) = '' THEN NULL ELSE TRIM(p_ooh_phone) END, -- Also set ooh for compatibility
    address = CASE WHEN p_address IS NULL OR TRIM(p_address) = '' THEN NULL ELSE TRIM(p_address) END,
    category = COALESCE(NULLIF(TRIM(p_category), ''), ''), -- Category is NOT NULL, default to empty string
    postcode = CASE WHEN p_postcode IS NULL OR TRIM(p_postcode) = '' THEN NULL ELSE TRIM(p_postcode) END,
    region = CASE WHEN p_region IS NULL OR TRIM(p_region) = '' THEN NULL ELSE TRIM(p_region) END,
    website = CASE WHEN p_website IS NULL OR TRIM(p_website) = '' THEN NULL ELSE TRIM(p_website) END,
    hourly_rate = p_hourly_rate,
    callout_fee = p_callout_fee,
    notes = CASE WHEN p_notes IS NULL OR TRIM(p_notes) = '' THEN NULL ELSE TRIM(p_notes) END,
    site_id = p_site_id,
    type = CASE WHEN p_type IS NULL OR TRIM(p_type) = '' THEN NULL ELSE TRIM(p_type) END,
    status = COALESCE(NULLIF(TRIM(p_status), ''), 'active'),
    is_active = COALESCE(p_is_active, true),
    contract_start = p_contract_start,
    contract_expiry = p_contract_expiry,
    contract_file = CASE WHEN p_contract_file IS NULL OR TRIM(p_contract_file) = '' THEN NULL ELSE TRIM(p_contract_file) END,
    updated_at = NOW()
  WHERE c.id = p_id
    AND c.company_id = p_company_id;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Log what was updated for debugging (remove in production)
  -- RAISE NOTICE 'Updated % rows for contractor %', v_rows_updated, p_id;
  
  -- If no rows were updated, raise an error with more details
  IF v_rows_updated = 0 THEN
    -- Double-check if the row exists
    IF NOT EXISTS(SELECT 1 FROM public.contractors c WHERE c.id = p_id) THEN
      RAISE EXCEPTION 'Contractor with id % does not exist', p_id;
    ELSIF NOT EXISTS(SELECT 1 FROM public.contractors c WHERE c.id = p_id AND c.company_id = p_company_id) THEN
      RAISE EXCEPTION 'Contractor id % exists but company_id mismatch. Expected %, found different company_id', p_id, p_company_id;
    ELSE
      RAISE EXCEPTION 'Update failed: 0 rows updated for contractor id % and company_id %. This may indicate a constraint violation or RLS blocking.', p_id, p_company_id;
    END IF;
  END IF;
  
  -- Return the updated row - query directly after update to ensure we get fresh data
  -- Use a fresh query to avoid any caching issues
  RETURN QUERY
  SELECT 
    c.id,
    c.company_id,
    c.name,
    c.contact_name,
    c.email,
    c.phone,
    c.ooh_phone,
    c.address,
    c.category,
    c.postcode,
    c.region,
    c.website,
    c.hourly_rate,
    c.callout_fee,
    c.notes,
    c.site_id,
    c.type,
    c.status,
    c.is_active,
    c.contract_start,
    c.contract_expiry,
    c.contract_file,
    c.created_at,
    c.updated_at
  FROM public.contractors c
  WHERE c.id = p_id
    AND c.company_id = p_company_id; -- Add company_id check for safety
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_contractor_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contractor_simple TO service_role;

-- Ensure the function owner has proper permissions
ALTER FUNCTION public.update_contractor_simple OWNER TO postgres;

-- Grant table permissions to postgres role (function owner)
GRANT ALL ON public.contractors TO postgres;

