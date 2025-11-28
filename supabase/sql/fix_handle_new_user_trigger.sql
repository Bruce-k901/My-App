-- Fix handle_new_user trigger function
-- The profiles table uses 'id' as the primary key (not 'auth_user_id')
-- This function should insert using 'id' which references auth.users.id

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
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    app_role,
    position_title
  )
  VALUES (
    NEW.id,  -- Use auth.users.id directly as profiles.id
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      (NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name'),
      'User'
    ),
    'Admin',
    'Administrator'
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

