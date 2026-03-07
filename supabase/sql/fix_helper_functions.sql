-- Fix helper functions to correctly find user profile
-- The issue is that get_user_company_id_safe() returns NULL

-- Step 1: Check what auth.uid() returns
SELECT 
  'Step 1: Check auth.uid()' as step,
  auth.uid() as current_user_id;

-- Step 2: Check if profile exists with id = auth.uid()
SET LOCAL role = 'postgres';
SELECT 
  'Step 2: Profile by id' as step,
  id,
  email,
  company_id,
  app_role,
  auth_user_id
FROM profiles
WHERE id = auth.uid();
RESET role;

-- Step 3: Check if profile exists with auth_user_id = auth.uid()
SET LOCAL role = 'postgres';
SELECT 
  'Step 3: Profile by auth_user_id' as step,
  id,
  email,
  company_id,
  app_role,
  auth_user_id
FROM profiles
WHERE auth_user_id = auth.uid();
RESET role;

-- Step 4: Check all profiles to see the structure
SET LOCAL role = 'postgres';
SELECT 
  'Step 4: All profiles structure' as step,
  id,
  email,
  company_id,
  app_role,
  auth_user_id,
  (id = auth.uid()) as id_matches,
  (auth_user_id = auth.uid()) as auth_user_id_matches
FROM profiles
LIMIT 10;
RESET role;

-- Step 5: Recreate helper functions with better error handling
CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try id first (most common case)
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = v_user_id
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE auth_user_id = v_user_id
    LIMIT 1;
  END IF;
  
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_app_role_safe()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_app_role TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN '';
  END IF;
  
  -- Try id first (most common case)
  SELECT COALESCE(app_role::TEXT, '') INTO v_app_role
  FROM public.profiles
  WHERE id = v_user_id
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF v_app_role IS NULL OR v_app_role = '' THEN
    SELECT COALESCE(app_role::TEXT, '') INTO v_app_role
    FROM public.profiles
    WHERE auth_user_id = v_user_id
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(v_app_role, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_manager_or_above_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_app_role TEXT;
BEGIN
  v_app_role := public.get_user_app_role_safe();
  RETURN LOWER(COALESCE(v_app_role, '')) IN ('admin', 'owner', 'manager');
END;
$$;

-- Step 6: Test the fixed functions
SELECT 
  'Step 6: Test fixed functions' as step,
  public.get_user_company_id_safe() as company_id,
  public.get_user_app_role_safe() as app_role,
  public.is_user_manager_or_above_safe() as is_manager;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_app_role_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_manager_or_above_safe() TO authenticated;

-- Step 8: Test if we can now see company profiles
SELECT 
  'Step 8: Test profiles visibility' as step,
  COUNT(*) as visible_profiles,
  ARRAY_AGG(id ORDER BY id) as profile_ids
FROM profiles
WHERE company_id = public.get_user_company_id_safe();

