-- Create balances using SECURITY DEFINER function to bypass RLS
-- This ensures the INSERT works even if RLS policies are restrictive

CREATE OR REPLACE FUNCTION public.initialize_company_leave_balances()
RETURNS TABLE(
  profile_id UUID,
  profile_name TEXT,
  leave_type_name TEXT,
  entitled_days DECIMAL,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_leave_type_id UUID;
  v_profile RECORD;
  v_current_year INTEGER;
  v_result RECORD;
BEGIN
  -- Get current company_id
  -- SECURITY DEFINER bypasses RLS, so we can query profiles directly
  -- Try id = auth.uid() first
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If not found, try auth_user_id
  IF v_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE auth_user_id IS NOT NULL 
      AND auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  IF v_company_id IS NULL THEN
    -- Try to get more info for debugging
    RAISE EXCEPTION 'No company_id found for current user. auth.uid() = %. Check if profile exists with id = auth.uid() OR auth_user_id = auth.uid()', auth.uid();
  END IF;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the default/annual leave type
  SELECT id INTO v_leave_type_id
  FROM leave_types
  WHERE company_id = v_company_id
    AND (code = 'ANNUAL' OR name ILIKE '%annual%' OR name ILIKE '%holiday%')
  LIMIT 1;
  
  -- If no specific annual leave type found, use the first one
  IF v_leave_type_id IS NULL THEN
    SELECT id INTO v_leave_type_id
    FROM leave_types
    WHERE company_id = v_company_id
    LIMIT 1;
  END IF;
  
  IF v_leave_type_id IS NULL THEN
    RAISE EXCEPTION 'No leave_types found for company. Please create a leave type first.';
  END IF;
  
  -- Create balances for all employees who don't have one for the current year
  FOR v_profile IN 
    SELECT p.id, p.annual_leave_allowance, p.company_id, p.email, p.full_name
    FROM profiles p
    WHERE p.company_id = v_company_id
      AND NOT EXISTS (
        SELECT 1 FROM leave_balances lb
        WHERE lb.profile_id = p.id
          AND lb.year = v_current_year
          AND lb.leave_type_id = v_leave_type_id
      )
  LOOP
    BEGIN
      INSERT INTO leave_balances (
        company_id,
        profile_id,
        leave_type_id,
        year,
        entitled_days
      )
      VALUES (
        v_profile.company_id,
        v_profile.id,
        v_leave_type_id,
        v_current_year,
        COALESCE(v_profile.annual_leave_allowance, 28)
      )
      ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;
      
      -- Return success
      SELECT 
        v_profile.id,
        COALESCE(v_profile.full_name, v_profile.email),
        (SELECT name FROM leave_types WHERE id = v_leave_type_id),
        COALESCE(v_profile.annual_leave_allowance, 28),
        TRUE,
        NULL::TEXT
      INTO v_result;
      
      RETURN QUERY SELECT 
        v_result.profile_id,
        v_result.profile_name,
        v_result.leave_type_name,
        v_result.entitled_days,
        v_result.success,
        v_result.error_message;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      RETURN QUERY SELECT 
        v_profile.id,
        COALESCE(v_profile.full_name, v_profile.email),
        (SELECT name FROM leave_types WHERE id = v_leave_type_id),
        0::DECIMAL,
        FALSE,
        SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_company_leave_balances() TO authenticated;

-- Now call the function to create balances
SELECT * FROM public.initialize_company_leave_balances();

-- Verify balances were created
SELECT 
  COUNT(*) as total_balances_created,
  COUNT(DISTINCT profile_id) as unique_employees
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE);

