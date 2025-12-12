-- ============================================================================
-- Fix Missing Profile for User
-- ============================================================================
-- This script creates a profile if it doesn't exist for user:
-- 232039a6-614f-4c66-97b5-447dd5968fb4
-- ============================================================================

-- Step 1: Check if user exists in auth.users
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_user_email TEXT;
  v_profile_exists BOOLEAN;
  v_profile_id UUID;
  v_profile_full_name TEXT;
  v_profile_company_id UUID;
  v_profile_app_role TEXT;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4')
  INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist in auth.users';
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4')
  INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE NOTICE 'Profile does not exist. Creating profile...';
    
    -- Create profile
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      app_role,
      company_id
    )
    SELECT 
      u.id,
      u.email,
      COALESCE(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1)
      ) as full_name,
      'Staff' as app_role, -- Use text value (capitalized as per enum/check constraint)
      NULL as company_id -- Will be set during onboarding
    FROM auth.users u
    WHERE u.id = '232039a6-614f-4c66-97b5-447dd5968fb4';
    
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '✅ Profile already exists';
  END IF;
  
  -- Show profile details
  RAISE NOTICE 'Profile details:';
  SELECT 
    id,
    full_name,
    company_id,
    app_role::text
  INTO 
    v_profile_id,
    v_profile_full_name,
    v_profile_company_id,
    v_profile_app_role
  FROM public.profiles
  WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
  
  IF v_profile_id IS NOT NULL THEN
    RAISE NOTICE '  ID: %', v_profile_id;
    RAISE NOTICE '  Email: %', v_user_email;
    RAISE NOTICE '  Full Name: %', v_profile_full_name;
    RAISE NOTICE '  Company ID: %', v_profile_company_id;
    RAISE NOTICE '  App Role: %', v_profile_app_role;
  END IF;
  
END $$;

-- Step 2: Verify profile can be queried
-- This should work if profile exists and RLS is correct
SELECT 
  'Profile Query Test' as test_name,
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

