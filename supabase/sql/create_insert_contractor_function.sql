-- Create RPC function to insert contractors
-- This bypasses PostgREST schema cache issues

CREATE OR REPLACE FUNCTION public.insert_contractor(
  p_company_id uuid,
  p_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_category text,
  p_emergency_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  contact_name text,
  email text,
  phone text,
  emergency_phone text,
  address text,
  category text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_user_company_id uuid;
  v_inserted_id uuid;
BEGIN
  -- Check user permissions
  SELECT app_role, company_id
  INTO v_user_role, v_user_company_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Verify user exists and has permission
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check company access
  IF v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: company mismatch';
  END IF;
  
  -- Check role permission (owner, admin, or manager can insert)
  IF LOWER(v_user_role::text) NOT IN ('owner', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Insert into maintenance_contractors
  INSERT INTO public.maintenance_contractors (
    company_id,
    name,
    contact_name,
    email,
    phone,
    emergency_phone,
    address,
    category,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    p_name,
    p_contact_name,
    p_email,
    p_phone,
    p_emergency_phone,
    p_address,
    p_category,
    p_notes,
    NOW(),
    NOW()
  )
  RETURNING maintenance_contractors.id INTO v_inserted_id;
  
  -- Return the inserted row
  RETURN QUERY
  SELECT 
    mc.id,
    mc.company_id,
    mc.name,
    mc.contact_name,
    mc.email,
    mc.phone,
    mc.emergency_phone,
    mc.address,
    mc.category,
    mc.notes,
    mc.created_at,
    mc.updated_at
  FROM public.maintenance_contractors mc
  WHERE mc.id = v_inserted_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_contractor TO authenticated;

-- Create update function
CREATE OR REPLACE FUNCTION public.update_contractor(
  p_id uuid,
  p_company_id uuid,
  p_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_category text,
  p_emergency_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  contact_name text,
  email text,
  phone text,
  emergency_phone text,
  address text,
  category text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_user_company_id uuid;
BEGIN
  -- Check user permissions
  SELECT app_role, company_id
  INTO v_user_role, v_user_company_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Verify user exists and has permission
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check company access
  IF v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: company mismatch';
  END IF;
  
  -- Check role permission
  IF LOWER(v_user_role::text) NOT IN ('owner', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Update maintenance_contractors
  UPDATE public.maintenance_contractors
  SET
    name = p_name,
    contact_name = p_contact_name,
    email = p_email,
    phone = p_phone,
    emergency_phone = p_emergency_phone,
    address = p_address,
    category = p_category,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_id
    AND company_id = p_company_id;
  
  -- Return the updated row
  RETURN QUERY
  SELECT 
    mc.id,
    mc.company_id,
    mc.name,
    mc.contact_name,
    mc.email,
    mc.phone,
    mc.emergency_phone,
    mc.address,
    mc.category,
    mc.notes,
    mc.created_at,
    mc.updated_at
  FROM public.maintenance_contractors mc
  WHERE mc.id = p_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_contractor TO authenticated;

