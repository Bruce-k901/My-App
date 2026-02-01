-- Simple Direct Fix - Query by Email
-- This bypasses the circular dependency issue

-- Step 1: Create a function that finds profile by email (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_profile_by_email()
RETURNS TABLE (
  profile_id UUID,
  auth_user_id UUID,
  email TEXT,
  company_id UUID,
  app_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Return profile by email (bypasses RLS)
  RETURN QUERY
  SELECT 
    p.id,
    p.auth_user_id,
    p.email,
    p.company_id,
    p.app_role::TEXT
  FROM public.profiles p
  WHERE p.email = user_email
  LIMIT 1;
END;
$$;

-- Test it
SELECT * FROM public.get_profile_by_email();

-- Step 2: Update get_user_company_id to use email lookup
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
  user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try id first
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Try auth_user_id
  IF result IS NULL THEN
    SELECT company_id INTO result
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- Try email (this should work!)
  IF result IS NULL AND user_email IS NOT NULL THEN
    SELECT company_id INTO result
    FROM public.profiles
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  RETURN result;
END;
$$;

-- Step 3: Update is_user_admin_or_manager to use email lookup
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN := false;
  user_email TEXT;
  role_text TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Try id first
  SELECT app_role::TEXT INTO role_text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Try auth_user_id
  IF role_text IS NULL THEN
    SELECT app_role::TEXT INTO role_text
    FROM public.profiles
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  -- Try email (this should work!)
  IF role_text IS NULL AND user_email IS NOT NULL THEN
    SELECT app_role::TEXT INTO role_text
    FROM public.profiles
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  -- Check if admin/manager
  IF role_text IS NOT NULL THEN
    result := (
      LOWER(role_text) IN ('owner', 'admin', 'manager', 'general_manager') OR
      role_text IN ('Owner', 'Admin', 'Manager', 'General Manager', 'General_Manager')
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_profile_by_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;

-- Test the functions
SELECT 
  public.get_user_company_id() as your_company_id,
  public.is_user_admin_or_manager() as is_admin_or_manager;

-- Show your profile
SELECT * FROM public.get_profile_by_email();










