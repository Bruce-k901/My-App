-- ============================================================================
-- Fix Function to Ensure It Never Returns NULL
-- NULL in a boolean context is treated as FALSE, blocking INSERTs
-- ============================================================================

BEGIN;

-- Recreate the function with explicit NULL handling
CREATE OR REPLACE FUNCTION public.check_user_company_match(user_uuid UUID, comp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Always return a boolean, never NULL
  
  -- If company_id is NULL, allow (conversation without company restriction)
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If user_uuid is NULL, deny
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Profile doesn't exist - deny
    RETURN FALSE;
  END IF;
  
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If user has no company_id set, deny (they need to be assigned to a company)
  IF user_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Allow if company matches (explicit boolean comparison)
  IF user_company_id = comp_id THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Ensure function ownership and permissions
ALTER FUNCTION public.check_user_company_match(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO anon;

-- Test the function to make sure it works
SELECT 
  '=== FUNCTION TEST ===' as section,
  auth.uid() as user_id,
  (SELECT company_id FROM public.profiles WHERE id = auth.uid()) as user_company_id,
  public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ) as function_result,
  pg_typeof(public.check_user_company_match(
    auth.uid(),
    (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  )) as return_type;

COMMIT;

