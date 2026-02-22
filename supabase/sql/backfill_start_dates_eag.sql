-- Backfill start dates for all EAG company staff
-- Uses random dates over the last 12 months
-- Only updates profiles with NULL start_date

DO $$
DECLARE
  v_eag_company_id UUID;
  v_profile RECORD;
  v_random_days_ago INTEGER;
  v_start_date DATE;
  v_updated_count INTEGER := 0;
BEGIN
  -- Find EAG company by name (case-insensitive)
  SELECT id INTO v_eag_company_id
  FROM companies
  WHERE LOWER(name) LIKE '%eag%'
  LIMIT 1;
  
  IF v_eag_company_id IS NULL THEN
    RAISE NOTICE 'EAG company not found. Available companies:';
    FOR v_profile IN SELECT id, name FROM companies LIMIT 10 LOOP
      RAISE NOTICE '  Company: % (ID: %)', v_profile.name, v_profile.id;
    END LOOP;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found EAG company: % (ID: %)', (SELECT name FROM companies WHERE id = v_eag_company_id), v_eag_company_id;
  
  -- Update all profiles with NULL start_date
  FOR v_profile IN 
    SELECT p.id, p.email, p.full_name, p.start_date
    FROM profiles p
    WHERE p.company_id = v_eag_company_id
      AND p.start_date IS NULL
  LOOP
    -- Generate random number of days ago (between 0 and 365 days)
    v_random_days_ago := floor(random() * 365)::INTEGER;
    
    -- Calculate start date
    v_start_date := CURRENT_DATE - (v_random_days_ago || ' days')::INTERVAL;
    
    -- Update the profile
    UPDATE profiles
    SET start_date = v_start_date
    WHERE id = v_profile.id;
    
    v_updated_count := v_updated_count + 1;
    RAISE NOTICE 'Updated % (%): start_date = %', 
      COALESCE(v_profile.full_name, v_profile.email), 
      v_profile.id, 
      v_start_date;
  END LOOP;
  
  RAISE NOTICE 'Finished! Updated % profiles with start dates', v_updated_count;
END $$;

-- Verify the updates
SELECT 
  'Summary' as step,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN start_date IS NOT NULL THEN 1 END) as profiles_with_start_date,
  COUNT(CASE WHEN start_date IS NULL THEN 1 END) as profiles_without_start_date,
  MIN(start_date) as earliest_start_date,
  MAX(start_date) as latest_start_date
FROM profiles
WHERE company_id = (
  SELECT id FROM companies WHERE LOWER(name) LIKE '%eag%' LIMIT 1
);

-- Show sample of updated profiles
SELECT 
  'Sample updated profiles' as step,
  full_name,
  email,
  start_date,
  (CURRENT_DATE - start_date)::INTEGER as days_ago
FROM profiles
WHERE company_id = (
  SELECT id FROM companies WHERE LOWER(name) LIKE '%eag%' LIMIT 1
)
AND start_date IS NOT NULL
ORDER BY start_date DESC
LIMIT 10;

