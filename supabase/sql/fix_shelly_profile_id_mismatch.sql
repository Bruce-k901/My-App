-- ============================================================================
-- FIX SHELLY'S PROFILE ID MISMATCH
-- ============================================================================
-- This script fixes the case where Shelly's profile exists but has a different ID
-- than her auth user ID. It will update the profile to match the auth user ID.
-- ============================================================================

DO $$
DECLARE
  v_auth_user_id UUID := 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62';
  v_auth_email TEXT := 'lee@e-a-g.co';
  v_profile_id UUID;
  v_profile_company_id UUID;
  v_profile_site_id UUID;
  v_profile_app_role app_role; -- Changed to enum type
  v_profile_full_name TEXT;
  -- Variables for storing profile data before deletion
  v_stored_full_name TEXT;
  v_stored_company_id UUID;
  v_stored_site_id UUID;
  v_stored_app_role app_role; -- Changed to enum type
  v_stored_position_title TEXT;
  v_stored_boh_foh TEXT;
  v_stored_phone_number TEXT;
  v_stored_pin_code TEXT;
  v_stored_food_safety_level INTEGER;
  v_stored_food_safety_expiry_date DATE;
  v_stored_h_and_s_level INTEGER;
  v_stored_h_and_s_expiry_date DATE;
  v_stored_fire_marshal_trained BOOLEAN;
  v_stored_fire_marshal_expiry_date DATE;
  v_stored_first_aid_trained BOOLEAN;
  v_stored_first_aid_expiry_date DATE;
  v_stored_cossh_trained BOOLEAN;
  v_stored_cossh_expiry_date DATE;
  v_stored_created_at TIMESTAMPTZ;
BEGIN
  RAISE NOTICE '=== FIXING SHELLY PROFILE ID MISMATCH ===';
  RAISE NOTICE '';

  -- Check if profile exists with wrong ID (by email)
  SELECT id, company_id, site_id, app_role, full_name
  INTO v_profile_id, v_profile_company_id, v_profile_site_id, v_profile_app_role, v_profile_full_name
  FROM public.profiles
  WHERE email = v_auth_email
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE NOTICE '❌ No profile found for email: %', v_auth_email;
    RAISE NOTICE 'Creating new profile with correct ID...';
    
    -- Create new profile with auth user ID
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      company_id,
      site_id,
      app_role,
      created_at,
      updated_at
    )
    VALUES (
      v_auth_user_id,
      v_auth_email,
      'Shelly Roderick',
      'fae1b377-859d-4ba6-bce2-d8aaf0044517', -- Checkly Test Co
      NULL, -- Will be set if site exists
      'Manager'::app_role,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Created new profile with ID: %', v_auth_user_id;
    
  ELSIF v_profile_id != v_auth_user_id THEN
    RAISE NOTICE '⚠️ Profile exists but ID does not match auth user ID';
    RAISE NOTICE '  Profile ID: %', v_profile_id;
    RAISE NOTICE '  Auth User ID: %', v_auth_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Updating profile ID to match auth user ID...';
    
    -- Check if a profile already exists with the auth user ID
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_auth_user_id) THEN
      RAISE NOTICE '⚠️ Profile already exists with auth user ID. Merging data...';
      
      -- Update the existing profile with auth user ID with data from the old profile
      UPDATE public.profiles
      SET
        email = v_auth_email,
        full_name = COALESCE(full_name, v_profile_full_name, 'Shelly Roderick'),
        company_id = COALESCE(company_id, v_profile_company_id, 'fae1b377-859d-4ba6-bce2-d8aaf0044517'),
        site_id = COALESCE(site_id, v_profile_site_id),
        app_role = COALESCE(app_role, v_profile_app_role, 'Manager'),
        updated_at = NOW()
      WHERE id = v_auth_user_id;
      
      -- Delete the old profile with wrong ID
      DELETE FROM public.profiles WHERE id = v_profile_id;
      
      RAISE NOTICE '✅ Merged profile data and deleted old profile';
    ELSE
      -- Update the profile ID to match auth user ID
      -- Note: We can't directly update the primary key, so we need to:
      -- 1. Store all data from old profile
      -- 2. Delete old profile (to free up email constraint)
      -- 3. Create new profile with correct ID and stored data
      
      -- Get all data from old profile
      SELECT 
        full_name, company_id, site_id, app_role, position_title,
        boh_foh, phone_number, pin_code,
        food_safety_level, food_safety_expiry_date,
        h_and_s_level, h_and_s_expiry_date,
        fire_marshal_trained, fire_marshal_expiry_date,
        first_aid_trained, first_aid_expiry_date,
        cossh_trained, cossh_expiry_date,
        created_at
      INTO
        v_stored_full_name, v_stored_company_id, v_stored_site_id, v_stored_app_role, v_stored_position_title,
        v_stored_boh_foh, v_stored_phone_number, v_stored_pin_code,
        v_stored_food_safety_level, v_stored_food_safety_expiry_date,
        v_stored_h_and_s_level, v_stored_h_and_s_expiry_date,
        v_stored_fire_marshal_trained, v_stored_fire_marshal_expiry_date,
        v_stored_first_aid_trained, v_stored_first_aid_expiry_date,
        v_stored_cossh_trained, v_stored_cossh_expiry_date,
        v_stored_created_at
      FROM public.profiles
      WHERE id = v_profile_id;
      
      -- Delete the old profile first (to free up email constraint)
      DELETE FROM public.profiles WHERE id = v_profile_id;
      RAISE NOTICE '✅ Deleted old profile with ID: %', v_profile_id;
      
      -- Now create new profile with correct ID
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        company_id,
        site_id,
        app_role,
        position_title,
        boh_foh,
        phone_number,
        pin_code,
        food_safety_level,
        food_safety_expiry_date,
        h_and_s_level,
        h_and_s_expiry_date,
        fire_marshal_trained,
        fire_marshal_expiry_date,
        first_aid_trained,
        first_aid_expiry_date,
        cossh_trained,
        cossh_expiry_date,
        created_at,
        updated_at
      )
      VALUES (
        v_auth_user_id, -- New ID matching auth user
        v_auth_email,
        COALESCE(v_stored_full_name, 'Shelly Roderick'),
        COALESCE(v_stored_company_id, 'fae1b377-859d-4ba6-bce2-d8aaf0044517'),
        v_stored_site_id,
        COALESCE(v_stored_app_role, 'Manager'::app_role), -- Use stored enum value or default
        v_stored_position_title,
        v_stored_boh_foh,
        v_stored_phone_number,
        v_stored_pin_code,
        v_stored_food_safety_level,
        v_stored_food_safety_expiry_date,
        v_stored_h_and_s_level,
        v_stored_h_and_s_expiry_date,
        COALESCE(v_stored_fire_marshal_trained, false),
        v_stored_fire_marshal_expiry_date,
        COALESCE(v_stored_first_aid_trained, false),
        v_stored_first_aid_expiry_date,
        COALESCE(v_stored_cossh_trained, false),
        v_stored_cossh_expiry_date,
        COALESCE(v_stored_created_at, NOW()),
        NOW()
      );
      
      RAISE NOTICE '✅ Created new profile with correct ID: %', v_auth_user_id;
    END IF;
  ELSE
    RAISE NOTICE '✅ Profile ID already matches auth user ID';
    RAISE NOTICE '  Profile ID: %', v_profile_id;
    RAISE NOTICE '';
    
    -- Ensure company_id is set
    IF v_profile_company_id IS NULL THEN
      RAISE NOTICE '⚠️ Profile has no company_id, setting to Checkly Test Co...';
      UPDATE public.profiles
      SET company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517'
      WHERE id = v_auth_user_id;
      RAISE NOTICE '✅ Set company_id';
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  
  -- Verify the fix
  SELECT id, email, company_id, app_role
  INTO v_profile_id, v_auth_email, v_profile_company_id, v_profile_app_role
  FROM public.profiles
  WHERE id = v_auth_user_id;
  
  IF v_profile_id IS NOT NULL THEN
    RAISE NOTICE '✅ Profile verified:';
    RAISE NOTICE '  ID: %', v_profile_id;
    RAISE NOTICE '  Email: %', v_auth_email;
    RAISE NOTICE '  Company ID: %', v_profile_company_id;
    RAISE NOTICE '  Role: %', v_profile_app_role;
  ELSE
    RAISE EXCEPTION '❌ Profile verification failed - profile not found after fix';
  END IF;

END $$;

-- Verification query
SELECT 
  '=== FINAL VERIFICATION ===' AS section,
  au.id AS auth_user_id,
  p.id AS profile_id,
  au.id = p.id AS ids_match,
  p.email,
  p.company_id,
  p.app_role,
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile does not exist'
    WHEN au.id != p.id THEN '⚠️ Profile ID does not match auth user ID'
    WHEN p.company_id IS NULL THEN '⚠️ Profile exists but has no company_id'
    ELSE '✅ Profile exists, IDs match, and has company_id'
  END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'lee@e-a-g.co';
