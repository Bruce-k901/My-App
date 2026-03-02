-- Fix Profile Lookup Functions
-- These functions aren't finding your profile - let's fix them

-- Fix get_user_company_id() to check email as fallback
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_company_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user's email first
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id or auth_user_id first
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  -- If not found, try by email (fallback)
  IF v_company_id IS NULL AND v_user_email IS NOT NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE email = v_user_email
    LIMIT 1;
  END IF;
  
  RETURN v_company_id;
END;
$function$;

-- Fix is_user_admin_or_manager() to check email as fallback
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
  v_user_email TEXT;
BEGIN
  -- Get user's email first
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try to find profile by id or auth_user_id first
  SELECT app_role::TEXT INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  -- If not found, try by email (fallback)
  IF v_role IS NULL AND v_user_email IS NOT NULL THEN
    SELECT app_role::TEXT INTO v_role
    FROM public.profiles
    WHERE email = v_user_email
    LIMIT 1;
  END IF;
  
  -- Check if role is admin or manager (case-insensitive)
  RETURN v_role IS NOT NULL AND (
    LOWER(v_role) IN ('admin', 'manager', 'owner', 'general_manager') OR
    v_role IN ('Admin', 'Manager', 'Owner', 'General Manager', 'General_Manager')
  );
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;

-- Test the functions
SELECT 
  public.get_user_company_id() as your_company_id,
  public.is_user_admin_or_manager() as is_admin_or_manager;










