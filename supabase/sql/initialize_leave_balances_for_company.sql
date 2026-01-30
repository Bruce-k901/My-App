-- Initialize leave balances for all employees in your company
-- This creates leave_balances records for employees who don't have them yet

-- First, check what employees exist
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  COUNT(lb.id) as existing_balances
FROM profiles p
LEFT JOIN leave_balances lb ON lb.profile_id = p.id AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE p.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
GROUP BY p.id, p.email, p.full_name, p.app_role, p.company_id
ORDER BY p.full_name;

-- Initialize balances for employees who don't have them
-- This will create leave_balances for the current year
DO $$
DECLARE
  v_company_id UUID;
  v_profile RECORD;
  v_leave_type_id UUID;
  v_current_year INTEGER;
BEGIN
  -- Get current company_id
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company_id found for current user';
    RETURN;
  END IF;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get the default/annual leave type (usually the first one or one marked as default)
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
    RAISE NOTICE 'No leave_types found for company. Please create a leave type first.';
    RETURN;
  END IF;
  
  -- Create balances for all employees who don't have one for the current year
  FOR v_profile IN 
    SELECT p.id, p.annual_leave_allowance, p.company_id
    FROM profiles p
    WHERE p.company_id = v_company_id
      AND NOT EXISTS (
        SELECT 1 FROM leave_balances lb
        WHERE lb.profile_id = p.id
          AND lb.year = v_current_year
          AND lb.leave_type_id = v_leave_type_id
      )
  LOOP
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
      COALESCE(v_profile.annual_leave_allowance, 28) -- Default to 28 days if not set
    )
    ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;
    
    RAISE NOTICE 'Created leave balance for profile %', v_profile.id;
  END LOOP;
  
  RAISE NOTICE 'Finished initializing leave balances';
END $$;

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

