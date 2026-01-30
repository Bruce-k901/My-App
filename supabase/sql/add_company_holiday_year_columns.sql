-- Add holiday year start columns to companies table if they don't exist
-- These columns allow companies to set a custom holiday year start date

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS holiday_year_start_month INTEGER DEFAULT 1 CHECK (holiday_year_start_month >= 1 AND holiday_year_start_month <= 12),
ADD COLUMN IF NOT EXISTS holiday_year_start_day INTEGER DEFAULT 1 CHECK (holiday_year_start_day >= 1 AND holiday_year_start_day <= 31);

COMMENT ON COLUMN companies.holiday_year_start_month IS 'Month when the holiday/leave year starts (1=January, 12=December). Defaults to 1 (January).';
COMMENT ON COLUMN companies.holiday_year_start_day IS 'Day of month when the holiday/leave year starts (1-31). Defaults to 1.';

