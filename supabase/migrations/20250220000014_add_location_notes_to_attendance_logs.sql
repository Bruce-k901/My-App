-- ============================================================================
-- Migration: Add location and notes columns to attendance_logs
-- Description: Adds missing columns to existing attendance_logs table
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if attendance_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN

    -- Add location column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs' 
      AND column_name = 'location'
    ) THEN
      ALTER TABLE public.attendance_logs ADD COLUMN location JSONB;
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs' 
      AND column_name = 'notes'
    ) THEN
      ALTER TABLE public.attendance_logs ADD COLUMN notes TEXT;
    END IF;

    -- Update sync functions to handle location and notes
    CREATE OR REPLACE FUNCTION sync_attendance_logs_insert()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_notes TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
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
        
        INSERT INTO public.staff_attendance (
          id,
          user_id,
          company_id,
          site_id,
          clock_in_time,
          clock_out_time,
          shift_status,
          total_hours,
          shift_notes,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.user_id,
          NEW.company_id,
          NEW.site_id,
          NEW.clock_in_at,
          NEW.clock_out_at,
          CASE WHEN NEW.clock_out_at IS NULL THEN 'on_shift' ELSE 'off_shift' END,
          CASE WHEN NEW.clock_out_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 3600.0
            ELSE NULL
          END,
          v_notes,
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
          clock_out_time = EXCLUDED.clock_out_time,
          shift_status = EXCLUDED.shift_status,
          total_hours = EXCLUDED.total_hours,
          shift_notes = EXCLUDED.shift_notes,
          updated_at = EXCLUDED.updated_at;
      END IF;
      
      RETURN NEW;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION sync_attendance_logs_update()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_notes TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
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
      END IF;
      
      RETURN NEW;
    END;
    $function$;

    CREATE OR REPLACE FUNCTION sync_staff_attendance_to_logs()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_location JSONB := NULL;
      v_notes TEXT := NULL;
      lat_val TEXT;
      lng_val TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
        -- Extract location from shift_notes if it contains "Location:"
        IF NEW.shift_notes IS NOT NULL AND NEW.shift_notes LIKE 'Location:%' THEN
          -- Try to parse location from shift_notes format: "Location: lat, lng"
          BEGIN
            lat_val := substring(NEW.shift_notes from 'Location:\s*([0-9.-]+)');
            lng_val := substring(NEW.shift_notes from 'Location:\s*[0-9.-]+,\s*([0-9.-]+)');
            IF lat_val IS NOT NULL AND lng_val IS NOT NULL THEN
              v_location := jsonb_build_object('lat', lat_val::numeric, 'lng', lng_val::numeric);
              -- Extract remaining notes after location
              v_notes := trim(substring(NEW.shift_notes from 'Location:[^\n]+\n?(.*)'));
              IF v_notes = '' THEN
                v_notes := NULL;
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
      END IF;
      
      RETURN NEW;
    END;
    $function$;

  ELSE
    RAISE NOTICE '⚠️ attendance_logs table does not exist yet - skipping location and notes columns addition';
  END IF;
END $$;

