-- Check if leave_balances exist for ANY year
-- The issue might be that balances exist but for a different year

CREATE OR REPLACE FUNCTION public.check_all_leave_balances()
RETURNS TABLE(
  step TEXT,
  result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get company_id
  SELECT company_id INTO v_company_id
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1;
  
  -- Step 1: Count ALL leave_balances (any year)
  RETURN QUERY
  SELECT 
    'All leave_balances (any year)'::TEXT,
    COUNT(*)::TEXT
  FROM leave_balances
  WHERE company_id = v_company_id;
  
  -- Step 2: Show years that have balances
  RETURN QUERY
  SELECT 
    'Years with balances'::TEXT,
    string_agg(DISTINCT year::TEXT, ', ' ORDER BY year::TEXT)
  FROM leave_balances
  WHERE company_id = v_company_id;
  
  -- Step 3: Show current year
  RETURN QUERY
  SELECT 
    'Current year'::TEXT,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER::TEXT;
  
  -- Step 4: Count balances for current year
  RETURN QUERY
  SELECT 
    'Balances for current year'::TEXT,
    COUNT(*)::TEXT
  FROM leave_balances
  WHERE company_id = v_company_id
    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Step 5: Show sample balances (any year)
  RETURN QUERY
  SELECT 
    'Sample balances'::TEXT,
    string_agg(
      'Profile: ' || profile_id::TEXT || ', Year: ' || year::TEXT || ', Type: ' || leave_type_id::TEXT,
      ' | '
    )
  FROM (
    SELECT profile_id, year, leave_type_id
    FROM leave_balances
    WHERE company_id = v_company_id
    LIMIT 5
  ) sub;
  
  -- Step 6: Count profiles in company
  RETURN QUERY
  SELECT 
    'Profiles in company'::TEXT,
    COUNT(*)::TEXT
  FROM profiles
  WHERE company_id = v_company_id;
END;
$$;

SELECT * FROM public.check_all_leave_balances();

