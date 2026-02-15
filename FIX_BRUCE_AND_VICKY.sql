-- =====================================================
-- FIX BRUCE KAMP AND VICKY THOMAS PAY DATA
-- =====================================================

-- Fix Bruce Kamp: Set as salaried
-- REPLACE 50000 with his actual annual salary
UPDATE profiles 
SET pay_type = 'salaried',
    annual_salary = 50000,  -- ⚠️ REPLACE WITH HIS ACTUAL ANNUAL SALARY
    hourly_rate = NULL
WHERE full_name = 'Bruce Kamp'
  AND id = '8066c4f2-fbff-4255-be96-71acf151473d';

-- Fix Vicky Thomas: Set correct hourly rate
-- REPLACE 12.00 with her actual hourly rate
UPDATE profiles 
SET hourly_rate = 12.00  -- ⚠️ REPLACE WITH HER ACTUAL HOURLY RATE
WHERE full_name = 'Vicky Thomas'
  AND id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62';

-- Fix other suspiciously high hourly rates
-- Abigail Moss: £1250/hour is wrong - probably meant to be monthly or annual
-- If £1250/month, that's about £7.50/hour (1250 * 12 / 52 / 40)
-- If £1250/week, that's about £31.25/hour (1250 / 40)
-- REPLACE with correct value:
UPDATE profiles 
SET hourly_rate = 12.00  -- ⚠️ REPLACE WITH HER ACTUAL HOURLY RATE
WHERE full_name = 'Abigail Moss'
  AND id = 'd67af399-d416-4d2f-be91-70cab3764a4f';

-- Josh Simmons: £1350/hour is wrong
UPDATE profiles 
SET hourly_rate = 12.00  -- ⚠️ REPLACE WITH HIS ACTUAL HOURLY RATE
WHERE full_name = 'Josh Simmons'
  AND id = '593d7c4f-d0e5-416f-ad23-eb278bb0cd17';

-- Verify the fixes
SELECT 
  full_name,
  pay_type,
  hourly_rate,
  annual_salary
FROM profiles
WHERE full_name IN ('Bruce Kamp', 'Vicky Thomas', 'Abigail Moss', 'Josh Simmons')
ORDER BY full_name;

