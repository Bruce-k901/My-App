-- Complete Profile Fix Script
-- This will fix your profile to have Admin role and company_id
-- Run this in Supabase SQL Editor
-- IMPORTANT: This uses SECURITY DEFINER to bypass RLS

-- Step 1: Create a helper function to fix your profile (bypasses RLS)
CREATE OR REPLACE FUNCTION public.fix_my_profile()
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  email TEXT,
  app_role TEXT,
  company_id UUID,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_email TEXT;
  v_profile_id UUID;
  v_company_name TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Find your profile (bypassing RLS with SECURITY DEFINER)
  SELECT id INTO v_profile_id 
  FROM public.profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() OR email = v_user_email
  LIMIT 1;
  
  -- If no profile exists, create one
  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (id, auth_user_id, email, full_name, app_role, company_id)
    VALUES (
      auth.uid(),
      auth.uid(),
      v_user_email,
      COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()), 'Admin User'),
      'Admin'::app_role,
      NULL  -- Will set company_id below
    )
    RETURNING id INTO v_profile_id;
  END IF;
  
  -- Find or create a company
  -- First, try to find an existing company (prefer one you might already be associated with)
  SELECT c.id, c.name INTO v_company_id, v_company_name
  FROM companies c
  WHERE EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.company_id = c.id 
    AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
  )
  ORDER BY c.created_at ASC 
  LIMIT 1;
  
  -- If still no company, try any company
  IF v_company_id IS NULL THEN
    SELECT id, name INTO v_company_id, v_company_name
    FROM companies 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;
  
  -- If no company exists at all, create one
  IF v_company_id IS NULL THEN
    INSERT INTO companies (name, created_at, updated_at)
    VALUES (
      'My Company',
      NOW(),
      NOW()
    )
    RETURNING id, name INTO v_company_id, v_company_name;
  END IF;
  
  -- Update your profile with Admin role and company_id (bypassing RLS)
  UPDATE public.profiles
  SET 
    app_role = 'Admin'::app_role,
    company_id = v_company_id,
    auth_user_id = COALESCE(auth_user_id, auth.uid())
  WHERE id = v_profile_id OR auth_user_id = auth.uid() OR email = v_user_email;
  
  -- Return the updated profile info
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.app_role::TEXT,
    p.company_id,
    v_company_name
  FROM public.profiles p
  WHERE p.id = v_profile_id OR p.auth_user_id = auth.uid() OR p.email = v_user_email
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fix_my_profile() TO authenticated;

-- Step 2: Run the fix
SELECT * FROM public.fix_my_profile();

-- Step 3: Verify everything is working
SELECT 
  id,
  full_name,
  email,
  app_role::TEXT as role,
  company_id,
  public.get_user_company_id() as function_company_id,
  public.is_user_admin_or_manager() as is_admin_check
FROM public.profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid();
