-- =====================================================
-- Add Tax Year Start Date to Payrun Schedules
-- =====================================================
-- UK tax year runs from 6 April to 5 April the following year
-- This allows payroll schedules to be aligned with tax years

ALTER TABLE payrun_schedules
ADD COLUMN IF NOT EXISTS tax_year_start_date DATE;

-- Set default to April 6th (UK tax year start) for existing records
UPDATE payrun_schedules
SET tax_year_start_date = DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months' + INTERVAL '5 days'
WHERE tax_year_start_date IS NULL;

-- Add comment
COMMENT ON COLUMN payrun_schedules.tax_year_start_date IS 'Start date of the tax year (typically 6 April in UK). Used for holiday accrual and payroll period calculations.';

