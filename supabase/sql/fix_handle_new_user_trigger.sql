-- Fix handle_new_user trigger function
-- The profiles table uses 'id' as the primary key (not 'auth_user_id')
-- This function should insert using 'id' which references auth.users.id
--
-- IMPORTANT: For staff invited via /api/users/create, the API route calls
-- createUser() which fires this trigger BEFORE the API can insert the profile.
-- We now read company_id and app_role from user_metadata so the trigger-created
-- profile already has the correct values. The API route still does an UPSERT
-- afterwards to set all remaining fields.

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a profile record for the new user
  -- The 'id' column in profiles is the primary key that references auth.users.id
  -- Read company_id from user_metadata (set by /api/users/create during invites)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    company_id,
    app_role,
    position_title
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      (NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name'),
      'User'
    ),
    -- Pull company_id from metadata if present (UUID or null)
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_id', '')), ''),
    -- Use role from metadata if present, otherwise default to Staff (not Admin)
    COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'app_role', '')), ''), 'Staff'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts if trigger fires twice

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

