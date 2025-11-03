-- Add working temperature range fields to assets table
-- This allows each asset to have its own specific working temperature range
-- which will be used for temperature logging compliance checking

-- Add columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS working_temp_min NUMERIC,
ADD COLUMN IF NOT EXISTS working_temp_max NUMERIC;

-- Add helpful comments
COMMENT ON COLUMN public.assets.working_temp_min IS 'Minimum working temperature in Celsius. Readings below this will trigger warnings/failures.';
COMMENT ON COLUMN public.assets.working_temp_max IS 'Maximum working temperature in Celsius. Readings above this will trigger warnings/failures.';

-- Create index for efficient queries when checking temperature compliance
CREATE INDEX IF NOT EXISTS idx_assets_temp_range ON public.assets(working_temp_min, working_temp_max) 
WHERE working_temp_min IS NOT NULL OR working_temp_max IS NOT NULL;

