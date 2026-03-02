-- ============================================================================
-- Migration: Fix attendance_logs Queries - Create Backward Compatible Table
-- Description: Creates attendance_logs table that syncs with staff_attendance
--              This provides full backward compatibility for old code
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN

    -- Drop the old table if it still exists
    DROP TABLE IF EXISTS public.attendance_logs CASCADE;

    -- Create attendance_logs table with old field names that syncs with staff_attendance
    CREATE TABLE public.attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      company_id UUID NOT NULL,
      site_id UUID,
      clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clock_out_at TIMESTAMPTZ,
      location JSONB, -- GPS coordinates: {lat, lng, accuracy} - stored in shift_notes in staff_attendance
      notes TEXT, -- Maps to shift_notes in staff_attendance
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Sync with staff_attendance table
      CONSTRAINT attendance_logs_sync CHECK (true) -- Placeholder, actual sync via triggers
    );

    -- Add foreign keys conditionally
    ALTER TABLE public.attendance_logs
    ADD CONSTRAINT attendance_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    ALTER TABLE public.attendance_logs
    ADD CONSTRAINT attendance_logs_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

    ALTER TABLE public.attendance_logs
    ADD CONSTRAINT attendance_logs_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;

    -- Create indexes matching staff_attendance
    CREATE INDEX idx_attendance_logs_user_id ON public.attendance_logs(user_id);
    CREATE INDEX idx_attendance_logs_site_id ON public.attendance_logs(site_id);
    CREATE INDEX idx_attendance_logs_company_id ON public.attendance_logs(company_id);
    CREATE INDEX idx_attendance_logs_clock_in_at ON public.attendance_logs(clock_in_at DESC);
    CREATE INDEX idx_attendance_logs_active ON public.attendance_logs(user_id, clock_out_at) 
      WHERE clock_out_at IS NULL;

-- Create indexes matching staff_attendance
CREATE INDEX idx_attendance_logs_user_id ON public.attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_site_id ON public.attendance_logs(site_id);
CREATE INDEX idx_attendance_logs_company_id ON public.attendance_logs(company_id);
CREATE INDEX idx_attendance_logs_clock_in_at ON public.attendance_logs(clock_in_at DESC);
CREATE INDEX idx_attendance_logs_active ON public.attendance_logs(user_id, clock_out_at) 
  WHERE clock_out_at IS NULL;

    -- Function: Sync INSERT from attendance_logs to staff_attendance
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

    -- Function: Sync UPDATE from attendance_logs to staff_attendance
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

    -- Create triggers
    CREATE TRIGGER trg_sync_attendance_logs_insert
      AFTER INSERT ON public.attendance_logs
      FOR EACH ROW
      EXECUTE FUNCTION sync_attendance_logs_insert();

    CREATE TRIGGER trg_sync_attendance_logs_update
      AFTER UPDATE ON public.attendance_logs
      FOR EACH ROW
      EXECUTE FUNCTION sync_attendance_logs_update();

    -- Function: Sync from staff_attendance to attendance_logs (for reads)
    CREATE OR REPLACE FUNCTION sync_staff_attendance_to_logs()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_location JSONB := NULL;
      v_notes TEXT := NULL;
      location_match TEXT;
      lat_val TEXT;
      lng_val TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
        -- Extract location from shift_notes if it contains "Location:"
        IF NEW.shift_notes IS NOT NULL AND NEW.shift_notes LIKE 'Location:%' THEN
          -- Try to parse location from shift_notes format: "Location: lat, lng"
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
      END IF;
      
      RETURN NEW;
    END;
    $function$;

    -- Trigger to sync staff_attendance changes to attendance_logs
    CREATE TRIGGER trg_sync_staff_to_logs
      AFTER INSERT OR UPDATE ON public.staff_attendance
      FOR EACH ROW
      EXECUTE FUNCTION sync_staff_attendance_to_logs();

    -- Enable RLS
    ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

    -- RLS Policies (mirror staff_attendance policies)
    CREATE POLICY attendance_logs_select_own
      ON public.attendance_logs FOR SELECT
      USING (user_id = auth.uid());

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY attendance_logs_select_company
        ON public.attendance_logs FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = attendance_logs.company_id
              AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
          )
        );

      CREATE POLICY attendance_logs_insert_own
        ON public.attendance_logs FOR INSERT
        WITH CHECK (
          user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = attendance_logs.company_id
          )
        );
    END IF;

    CREATE POLICY attendance_logs_update_own
      ON public.attendance_logs FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE ON public.attendance_logs TO authenticated;
    GRANT SELECT ON public.attendance_logs TO anon;

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles, companies, sites, staff_attendance) do not exist yet - skipping attendance_logs table creation';
  END IF;
END $$;

-- Note: This creates a bidirectional sync between attendance_logs and staff_attendance.
-- All operations on either table will be synced to the other.

