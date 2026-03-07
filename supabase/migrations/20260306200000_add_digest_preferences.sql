-- Add digest preference columns to profiles table
-- These control what appears in the daily ops summary email

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_include_compliance boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_include_staff boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_include_stock boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_include_assets boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digest_include_calendar boolean DEFAULT true;

COMMENT ON COLUMN profiles.digest_enabled IS 'Whether user receives daily ops summary emails';
COMMENT ON COLUMN profiles.digest_include_compliance IS 'Include compliance section (tasks, incidents, temp checks)';
COMMENT ON COLUMN profiles.digest_include_staff IS 'Include staff section (sickness, holidays, reviews)';
COMMENT ON COLUMN profiles.digest_include_stock IS 'Include stock/sales section (expiring items, sales data)';
COMMENT ON COLUMN profiles.digest_include_assets IS 'Include assets section (callouts, out of commission equipment)';
COMMENT ON COLUMN profiles.digest_include_calendar IS 'Include calendar section (today''s meetings and events)';
