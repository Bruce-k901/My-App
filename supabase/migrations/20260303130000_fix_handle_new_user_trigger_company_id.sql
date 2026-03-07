-- Fix handle_new_user trigger to read company_id and app_role from user_metadata
-- This prevents the race condition where the trigger creates a profile without
-- company_id before the /api/users/create route can set it.
--
-- The API route sets user_metadata: { full_name, company_id, app_role } when
-- calling admin.auth.admin.createUser(). The trigger now reads these values
-- so the profile is correctly linked from the start.

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- Use role from metadata if present, otherwise default to Staff
    COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'app_role', '')), ''), 'Staff'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
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
