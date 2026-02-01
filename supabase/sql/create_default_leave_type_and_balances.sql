-- Create default leave type and initialize balances
-- This handles the case where leave_types don't exist yet

DO $$
DECLARE
  v_company_id UUID;
  v_leave_type_id UUID;
  v_profile RECORD;
  v_current_year INTEGER;
  v_created_count INTEGER := 0;
BEGIN
  -- Get current company_id
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE '❌ No company_id found for current user';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found company_id: %', v_company_id;
  
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Check if leave_types exist
  SELECT id INTO v_leave_type_id
  FROM leave_types
  WHERE company_id = v_company_id
    AND (code = 'ANNUAL' OR name ILIKE '%annual%' OR name ILIKE '%holiday%')
  LIMIT 1;
  
  -- If no leave type exists, create one
  IF v_leave_type_id IS NULL THEN
    RAISE NOTICE '⚠️ No leave type found. Creating default "Annual Leave" type...';
    
    INSERT INTO leave_types (
      company_id,
      name,
      code,
      color,
      deducts_from_allowance,
      requires_approval,
      is_active
    )
    VALUES (
      v_company_id,
      'Annual Leave',
      'ANNUAL',
      '#10B981', -- Green color
      TRUE, -- Deducts from allowance
      TRUE, -- Requires approval
      TRUE -- Active
    )
    RETURNING id INTO v_leave_type_id;
    
    RAISE NOTICE '✅ Created leave type with id: %', v_leave_type_id;
  ELSE
    RAISE NOTICE '✅ Found existing leave type: %', v_leave_type_id;
  END IF;
  
  -- Now create balances for all employees
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
        COALESCE(v_profile.annual_leave_allowance, 28) -- Default to 28 days if not set
      )
      ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE '✅ Created balance for: % (%)', COALESCE(v_profile.full_name, v_profile.email), v_profile.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed to create balance for %: %', v_profile.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Finished! Created % balances', v_created_count;
END $$;

-- Verify what was created
SELECT 
  'Leave Types' as type,
  COUNT(*) as count
FROM leave_types
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)

UNION ALL

SELECT 
  'Leave Balances' as type,
  COUNT(*) as count
FROM leave_balances
WHERE company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Show the balances that were created
SELECT 
  lb.id,
  p.full_name,
  p.email,
  lt.name as leave_type,
  lb.year,
  lb.entitled_days,
  lb.taken_days,
  lb.pending_days,
  (lb.entitled_days - lb.taken_days - lb.pending_days) as remaining
FROM leave_balances lb
JOIN profiles p ON p.id = lb.profile_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.company_id = (
  SELECT company_id FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid() 
  LIMIT 1
)
AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY p.full_name;

