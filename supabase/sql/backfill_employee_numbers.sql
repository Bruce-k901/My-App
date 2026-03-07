-- Backfill employee numbers for existing employees that don't have one
-- This script will generate employee numbers for profiles that have a company_id but no employee_number

DO $$
DECLARE
  profile_record RECORD;
  company_record RECORD;
  company_prefix TEXT;
  max_number INTEGER;
  next_number INTEGER;
  new_employee_number TEXT;
BEGIN
  -- Loop through all profiles without employee numbers
  FOR profile_record IN
    SELECT p.id, p.company_id, c.name as company_name
    FROM profiles p
    LEFT JOIN companies c ON c.id = p.company_id
    WHERE p.employee_number IS NULL
      AND p.company_id IS NOT NULL
      AND c.name IS NOT NULL
    ORDER BY p.created_at ASC
  LOOP
    -- Get first 3 letters of company name (uppercase, remove spaces/special chars)
    company_prefix := UPPER(REGEXP_REPLACE(profile_record.company_name, '[^a-zA-Z]', '', 'g'));
    company_prefix := SUBSTRING(company_prefix FROM 1 FOR 3);
    
    -- Skip if company name too short
    IF LENGTH(company_prefix) < 3 THEN
      RAISE NOTICE 'Skipping profile % - company name too short: %', profile_record.id, profile_record.company_name;
      CONTINUE;
    END IF;
    
    company_prefix := company_prefix || 'EMP';
    
    -- Find max existing employee number with this prefix
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM '\d+$') AS INTEGER)), 0)
    INTO max_number
    FROM profiles
    WHERE company_id = profile_record.company_id
      AND employee_number IS NOT NULL
      AND employee_number LIKE company_prefix || '%';
    
    -- Generate next number
    next_number := max_number + 1;
    new_employee_number := company_prefix || LPAD(next_number::TEXT, 3, '0');
    
    -- Update the profile
    UPDATE profiles
    SET employee_number = new_employee_number
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Assigned employee number % to profile % (company: %)', 
      new_employee_number, profile_record.id, profile_record.company_name;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete!';
END $$;

-- Verify the backfill worked
SELECT 
  COUNT(*) as total_profiles,
  COUNT(employee_number) as profiles_with_employee_number,
  COUNT(*) - COUNT(employee_number) as profiles_without_employee_number
FROM profiles
WHERE company_id IS NOT NULL;
