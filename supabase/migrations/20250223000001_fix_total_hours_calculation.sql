-- ============================================================================
-- Migration: 20250223000001_fix_total_hours_calculation.sql
-- Description: Ensure total_hours is calculated correctly when clocking out
-- ============================================================================

-- Drop and recreate the trigger function to ensure it's working
DROP TRIGGER IF EXISTS trg_calculate_total_hours ON public.staff_attendance;

-- Recreate the function with improved logic
CREATE OR REPLACE FUNCTION public.calculate_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate total_hours when clocking out
  IF NEW.clock_out_time IS NOT NULL AND (OLD.clock_out_time IS NULL OR OLD.clock_out_time IS DISTINCT FROM NEW.clock_out_time) THEN
    -- Calculate hours between clock in and clock out
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0;
    
    -- Ensure shift_status is set to off_shift when clocking out
    IF NEW.shift_status != 'off_shift' THEN
      NEW.shift_status := 'off_shift';
    END IF;
  END IF;
  
  -- If clocking out but total_hours is still null, calculate it
  IF NEW.clock_out_time IS NOT NULL AND NEW.total_hours IS NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trg_calculate_total_hours
  BEFORE UPDATE ON public.staff_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_total_hours();

-- Fix any existing records that have clock_out_time but no total_hours
UPDATE public.staff_attendance
SET total_hours = EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600.0
WHERE clock_out_time IS NOT NULL 
  AND total_hours IS NULL;

-- Add comment
COMMENT ON FUNCTION public.calculate_total_hours() IS 'Automatically calculates total_hours when clocking out based on clock_in_time and clock_out_time';

