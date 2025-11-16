-- ============================================================================
-- Test Function with Detailed Logging
-- This will show us exactly what the function is doing
-- ============================================================================

-- Create a temporary logging function
CREATE OR REPLACE FUNCTION public.test_check_user_company_match(user_uuid UUID, comp_id UUID)
RETURNS TABLE(
  step TEXT,
  value TEXT,
  result BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  profile_exists BOOLEAN;
  function_result BOOLEAN;
BEGIN
  -- Step 1: Check if comp_id is NULL
  IF comp_id IS NULL THEN
    RETURN QUERY SELECT 'comp_id is NULL'::TEXT, 'N/A'::TEXT, TRUE::BOOLEAN;
    RETURN;
  END IF;
  RETURN QUERY SELECT 'comp_id is NOT NULL'::TEXT, comp_id::TEXT, NULL::BOOLEAN;
  
  -- Step 2: Check if user_uuid is NULL
  IF user_uuid IS NULL THEN
    RETURN QUERY SELECT 'user_uuid is NULL'::TEXT, 'N/A'::TEXT, FALSE::BOOLEAN;
    RETURN;
  END IF;
  RETURN QUERY SELECT 'user_uuid is NOT NULL'::TEXT, user_uuid::TEXT, NULL::BOOLEAN;
  
  -- Step 3: Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
  IF NOT profile_exists THEN
    RETURN QUERY SELECT 'Profile does NOT exist'::TEXT, 'N/A'::TEXT, FALSE::BOOLEAN;
    RETURN;
  END IF;
  RETURN QUERY SELECT 'Profile EXISTS'::TEXT, 'N/A'::TEXT, NULL::BOOLEAN;
  
  -- Step 4: Get user's company_id
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF user_company_id IS NULL THEN
    RETURN QUERY SELECT 'user company_id is NULL'::TEXT, 'N/A'::TEXT, FALSE::BOOLEAN;
    RETURN;
  END IF;
  RETURN QUERY SELECT 'user company_id found'::TEXT, user_company_id::TEXT, NULL::BOOLEAN;
  
  -- Step 5: Compare company_ids
  IF user_company_id = comp_id THEN
    RETURN QUERY SELECT 'Company IDs MATCH'::TEXT, 'N/A'::TEXT, TRUE::BOOLEAN;
  ELSE
    RETURN QUERY SELECT 'Company IDs DO NOT MATCH'::TEXT, 
      format('User: %s, Insert: %s', user_company_id, comp_id)::TEXT, 
      FALSE::BOOLEAN;
  END IF;
END;
$$;

-- Test it
SELECT * FROM public.test_check_user_company_match(
  auth.uid(),
  (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Clean up
DROP FUNCTION IF EXISTS public.test_check_user_company_match(UUID, UUID);

