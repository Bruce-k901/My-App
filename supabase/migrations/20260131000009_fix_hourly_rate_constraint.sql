-- Migration to add safeguards for hourly_rate storage
-- hourly_rate is stored in PENCE (e.g., £16.50 = 1650)

-- First, fix any incorrectly stored values (pounds stored as pence)
-- Values < 100 are likely in pounds and should be multiplied by 100
UPDATE profiles
SET hourly_rate = hourly_rate * 100
WHERE hourly_rate IS NOT NULL
  AND hourly_rate > 0
  AND hourly_rate < 100;

-- Log how many were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM profiles
  WHERE hourly_rate IS NOT NULL
    AND hourly_rate > 0
    AND hourly_rate < 10000;

  IF fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % hourly_rate values that were stored incorrectly', fixed_count;
  END IF;
END $$;

-- Add a check constraint to ensure hourly_rate is in a reasonable range
-- This prevents values that are clearly wrong (too low = pounds not pence)
-- Minimum: 400 pence (£4/hr) - below NMW but allows edge cases
-- Maximum: 50000 pence (£500/hr) - very high but possible for specialists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_hourly_rate_range;

ALTER TABLE profiles
ADD CONSTRAINT profiles_hourly_rate_range
CHECK (hourly_rate IS NULL OR (hourly_rate >= 400 AND hourly_rate <= 50000));

-- Add a comment explaining the storage format
COMMENT ON COLUMN profiles.hourly_rate IS 'Hourly rate in PENCE (e.g., £16.50 = 1650). Constraint ensures values between £4-£500/hr.';

-- Also fix any rota_shifts table if it has hourly_rate
UPDATE rota_shifts
SET hourly_rate = hourly_rate * 100
WHERE hourly_rate IS NOT NULL
  AND hourly_rate > 0
  AND hourly_rate < 100;

-- Add constraint to rota_shifts as well (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rota_shifts' AND column_name = 'hourly_rate'
  ) THEN
    EXECUTE 'ALTER TABLE rota_shifts DROP CONSTRAINT IF EXISTS rota_shifts_hourly_rate_range';
    EXECUTE 'ALTER TABLE rota_shifts ADD CONSTRAINT rota_shifts_hourly_rate_range CHECK (hourly_rate IS NULL OR (hourly_rate >= 400 AND hourly_rate <= 50000))';
  END IF;
END $$;
