-- ============================================================================
-- Migration: Fix Recursive Trigger Loop in attendance_logs sync
-- Description: Prevents infinite recursion between staff_attendance and attendance_logs
--              by using session variables to track sync state
-- ============================================================================

BEGIN;

-- Drop and recreate sync function to prevent recursion using session variables
CREATE OR REPLACE FUNCTION sync_attendance_logs_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notes TEXT;
  v_syncing BOOLEAN;
BEGIN
  -- Check if we're already in a sync operation (prevents recursion)
  v_syncing := COALESCE(current_setting('app.syncing_attendance', TRUE)::boolean, FALSE);
  IF v_syncing THEN
    RETURN NEW; -- Already syncing, skip to prevent recursion
  END IF;

  -- Check if this update actually changed anything relevant
  -- If OLD and NEW have same clock_out_at, skip sync to prevent recursion
  IF OLD.clock_out_at IS NOT DISTINCT FROM NEW.clock_out_at 
     AND OLD.clock_in_at IS NOT DISTINCT FROM NEW.clock_in_at
     AND OLD.location IS NOT DISTINCT FROM NEW.location
     AND OLD.notes IS NOT DISTINCT FROM NEW.notes THEN
    RETURN NEW; -- No changes, skip sync
  END IF;

  -- Set session variable to indicate we're syncing
  PERFORM set_config('app.syncing_attendance', 'true', TRUE);

  BEGIN
    -- Combine location and notes into shift_notes
    v_notes := NULL;
    IF NEW.location IS NOT NULL THEN
      v_notes := 'Location: ' || (NEW.location->>'lat')::text || ', ' || (NEW.location->>'lng')::text;
      IF NEW.notes IS NOT NULL THEN
        v_notes := v_notes || E'\n' || NEW.notes;
      END IF;
    ELSIF NEW.notes IS NOT NULL THEN
      v_notes := NEW.notes;
    END IF;
  
    UPDATE public.staff_attendance SET
      clock_out_time = NEW.clock_out_at,
      shift_status = CASE WHEN NEW.clock_out_at IS NULL THEN 'on_shift' ELSE 'off_shift' END,
      total_hours = CASE WHEN NEW.clock_out_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 3600.0
        ELSE NULL
      END,
      shift_notes = v_notes,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Clear sync flag on error
    PERFORM set_config('app.syncing_attendance', 'false', TRUE);
    RAISE;
  END;
  
  -- Clear sync flag
  PERFORM set_config('app.syncing_attendance', 'false', TRUE);
  
  RETURN NEW;
END;
$$;

-- Drop and recreate sync function from staff_attendance to attendance_logs
CREATE OR REPLACE FUNCTION sync_staff_attendance_to_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location JSONB := NULL;
  v_notes TEXT := NULL;
  v_syncing BOOLEAN;
BEGIN
  -- Check if we're already in a sync operation (prevents recursion)
  v_syncing := COALESCE(current_setting('app.syncing_attendance', TRUE)::boolean, FALSE);
  IF v_syncing THEN
    RETURN NEW; -- Already syncing, skip to prevent recursion
  END IF;

  -- Check if this update actually changed anything relevant
  -- If OLD and NEW have same clock_out_time, skip sync to prevent recursion
  IF OLD.clock_out_time IS NOT DISTINCT FROM NEW.clock_out_time 
     AND OLD.clock_in_time IS NOT DISTINCT FROM NEW.clock_in_time
     AND OLD.shift_notes IS NOT DISTINCT FROM NEW.shift_notes THEN
    RETURN NEW; -- No changes, skip sync
  END IF;

  -- Set session variable to indicate we're syncing
  PERFORM set_config('app.syncing_attendance', 'true', TRUE);

  BEGIN
    -- Extract location from shift_notes if it contains "Location:"
    IF NEW.shift_notes IS NOT NULL AND NEW.shift_notes LIKE 'Location:%' THEN
      -- Try to parse location from shift_notes format: "Location: lat, lng"
      DECLARE
        location_match TEXT;
        lat_val TEXT;
        lng_val TEXT;
      BEGIN
        location_match := substring(NEW.shift_notes from 'Location:\s*([0-9.-]+),\s*([0-9.-]+)');
        IF location_match IS NOT NULL THEN
          lat_val := substring(location_match from '^([0-9.-]+)');
          lng_val := substring(location_match from ',\s*([0-9.-]+)$');
          IF lat_val IS NOT NULL AND lng_val IS NOT NULL THEN
            v_location := jsonb_build_object('lat', lat_val::numeric, 'lng', lng_val::numeric);
            -- Extract remaining notes after location
            v_notes := trim(substring(NEW.shift_notes from 'Location:[^\n]+\n?(.*)'));
            IF v_notes = '' THEN
              v_notes := NULL;
            END IF;
          END IF;
        ELSE
          v_notes := NEW.shift_notes;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_notes := NEW.shift_notes;
      END;
    ELSE
      v_notes := NEW.shift_notes;
    END IF;
  
    INSERT INTO public.attendance_logs (
      id,
      user_id,
      company_id,
      site_id,
      clock_in_at,
      clock_out_at,
      location,
      notes,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.company_id,
      NEW.site_id,
      NEW.clock_in_time,
      NEW.clock_out_time,
      v_location,
      v_notes,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      clock_out_at = EXCLUDED.clock_out_at,
      location = EXCLUDED.location,
      notes = EXCLUDED.notes,
      updated_at = EXCLUDED.updated_at;
  EXCEPTION WHEN OTHERS THEN
    -- Clear sync flag on error
    PERFORM set_config('app.syncing_attendance', 'false', TRUE);
    RAISE;
  END;
  
  -- Clear sync flag
  PERFORM set_config('app.syncing_attendance', 'false', TRUE);
  
  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================================================
-- Usage Notes:
-- 
-- This migration fixes the recursive trigger loop by:
-- 1. Using session variables to track sync state (app.syncing_attendance)
-- 2. Checking if we're already syncing before starting a new sync (prevents recursion)
-- 3. Checking if values actually changed before syncing (prevents unnecessary syncs)
--
-- This prevents the infinite loop:
-- staff_attendance UPDATE → trigger → attendance_logs UPDATE → trigger → staff_attendance UPDATE...
--
-- Now it becomes:
-- staff_attendance UPDATE → trigger (sets flag) → attendance_logs UPDATE (sees flag, skips) → done
--
-- The session variable approach is safer than ALTER TABLE because:
-- - No table locks required
-- - Works within active transactions
-- - Automatically cleared on transaction end
-- ============================================================================

