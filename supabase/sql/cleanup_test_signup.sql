-- Cleanup script for test signup
-- Deletes user bruce.kamp@outlook.com, Checkly Test Co company, and all related data
-- Safe to run - avoids gm_index trigger issues by not deleting profiles directly

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1) Find and delete auth user for bruce.kamp@outlook.com
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'bruce.kamp@outlook.com';

  IF v_user_id IS NOT NULL THEN
    -- Clean up dependent rows that reference this auth user
    DELETE FROM public.push_subscriptions WHERE user_id = v_user_id;
    DELETE FROM public.attendance_logs   WHERE user_id = v_user_id;

    -- Delete companies owned by this user
    DELETE FROM public.companies
    WHERE user_id = v_user_id
       OR created_by = v_user_id
       OR name = 'Checkly Test Co';

    -- Finally delete the auth user (this will cascade to profiles via trigger if configured)
    DELETE FROM auth.users WHERE id = v_user_id;
    
    RAISE NOTICE 'Deleted user: %', v_user_id;
  ELSE
    RAISE NOTICE 'No user found with email: bruce.kamp@outlook.com';
  END IF;

  -- 2) Clean up any remaining "Checkly Test Co" companies (in case user_id was different)
  DELETE FROM public.companies
  WHERE name = 'Checkly Test Co';

  -- 3) Soft-disable any orphaned profiles (set status to inactive instead of deleting)
  -- This avoids the gm_index trigger issue
  UPDATE public.profiles
  SET status = 'inactive'
  WHERE email = 'bruce.kamp@outlook.com'
     OR LOWER(full_name) = LOWER('Shelly Kamp');

  RAISE NOTICE 'Cleanup complete';
END $$;


