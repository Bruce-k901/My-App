-- ============================================================================
-- Migration: Staff Attendance & Shift Management System
-- Description: Complete clock in/out system with shift-based filtering
--              for tasks and notifications
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
DECLARE
  v_user_column TEXT;
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    
    -- Determine which user column exists (profile_id preferred, fallback to user_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_attendance' 
          AND column_name = 'profile_id'
      ) THEN
        v_user_column := 'profile_id';
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_attendance' 
          AND column_name = 'user_id'
      ) THEN
        v_user_column := 'user_id';
      ELSE
        v_user_column := 'profile_id'; -- Default for new tables
      END IF;
    ELSE
      v_user_column := 'profile_id'; -- Default for new tables
    END IF;

    -- ============================================================================
    -- 1. STAFF ATTENDANCE TABLE
    -- ============================================================================

    -- Check if table exists and what user column it has
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      -- Table doesn't exist, create it with profile_id (preferred) or user_id
      CREATE TABLE public.staff_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL,
        company_id UUID NOT NULL,
        site_id UUID NOT NULL,
        clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        clock_out_time TIMESTAMPTZ,
        shift_status TEXT NOT NULL DEFAULT 'on_shift' CHECK (shift_status IN ('on_shift', 'off_shift')),
        total_hours DECIMAL(10, 2), -- Auto-calculated when clocking out
        shift_notes TEXT, -- Optional handover notes
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT staff_attendance_clock_out_after_clock_in CHECK (
          clock_out_time IS NULL OR clock_out_time >= clock_in_time
        ),
        CONSTRAINT staff_attendance_shift_status_consistency CHECK (
          (clock_out_time IS NULL AND shift_status = 'on_shift') OR
          (clock_out_time IS NOT NULL AND shift_status = 'off_shift')
        )
      );

      -- Add foreign key for profile_id
      ALTER TABLE public.staff_attendance
      ADD CONSTRAINT staff_attendance_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    ELSE
      -- Table exists, check if it has user_id or profile_id and add missing foreign key
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_attendance' 
          AND column_name = 'profile_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'staff_attendance_profile_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'staff_attendance'
      ) THEN
        ALTER TABLE public.staff_attendance
        ADD CONSTRAINT staff_attendance_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_attendance' 
          AND column_name = 'user_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'staff_attendance_user_id_fkey' 
        AND table_schema = 'public' 
        AND table_name = 'staff_attendance'
      ) THEN
        ALTER TABLE public.staff_attendance
        ADD CONSTRAINT staff_attendance_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'staff_attendance_company_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'staff_attendance'
    ) THEN
      ALTER TABLE public.staff_attendance
      ADD CONSTRAINT staff_attendance_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'staff_attendance_site_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'staff_attendance'
    ) THEN
      ALTER TABLE public.staff_attendance
      ADD CONSTRAINT staff_attendance_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;
    END IF;

    -- Indexes for performance (use whichever column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'profile_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_profile_id ON public.staff_attendance(profile_id);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_user_id ON public.staff_attendance(user_id);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_site_id ON public.staff_attendance(site_id);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_company_id ON public.staff_attendance(company_id);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_shift_status ON public.staff_attendance(shift_status);
    -- Create active shift index with correct column name
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'profile_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_active_shift ON public.staff_attendance(profile_id, shift_status) 
        WHERE shift_status = 'on_shift' AND clock_out_time IS NULL;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'staff_attendance' 
        AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_staff_attendance_active_shift ON public.staff_attendance(user_id, shift_status) 
        WHERE shift_status = 'on_shift' AND clock_out_time IS NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_clock_in_time ON public.staff_attendance(clock_in_time DESC);

    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS trg_staff_attendance_updated_at ON public.staff_attendance;
    DROP TRIGGER IF EXISTS trg_calculate_total_hours ON public.staff_attendance;
    DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_shifts ON public.staff_attendance;

    -- Updated_at trigger
    CREATE OR REPLACE FUNCTION public.staff_attendance_set_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      CREATE TRIGGER trg_staff_attendance_updated_at
        BEFORE UPDATE ON public.staff_attendance
        FOR EACH ROW
        EXECUTE FUNCTION public.staff_attendance_set_updated_at();
    END IF;

    -- Trigger to auto-calculate total_hours on clock out
    CREATE OR REPLACE FUNCTION public.calculate_total_hours()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      IF NEW.clock_out_time IS NOT NULL AND OLD.clock_out_time IS NULL THEN
        -- Calculate hours between clock in and clock out
        NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0;
        NEW.shift_status := 'off_shift';
      END IF;
      RETURN NEW;
    END;
    $function$;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      CREATE TRIGGER trg_calculate_total_hours
        BEFORE UPDATE ON public.staff_attendance
        FOR EACH ROW
        EXECUTE FUNCTION public.calculate_total_hours();
    END IF;

    -- Trigger to prevent duplicate active shifts (handles both profile_id and user_id)
    CREATE OR REPLACE FUNCTION public.prevent_duplicate_active_shifts()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    DECLARE
      v_count INTEGER;
      v_user_id_val UUID;
    BEGIN
      -- Get user ID from whichever column exists
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id') THEN
        v_user_id_val := NEW.profile_id;
        SELECT COUNT(*) INTO v_count
        FROM public.staff_attendance
        WHERE profile_id = v_user_id_val
          AND shift_status = 'on_shift'
          AND clock_out_time IS NULL
          AND id != NEW.id;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'user_id') THEN
        v_user_id_val := NEW.user_id;
        SELECT COUNT(*) INTO v_count
        FROM public.staff_attendance
        WHERE user_id = v_user_id_val
          AND shift_status = 'on_shift'
          AND clock_out_time IS NULL
          AND id != NEW.id;
      ELSE
        RETURN NEW; -- No user column found, skip check
      END IF;
      
      IF v_count > 0 THEN
        RAISE EXCEPTION 'User already has an active shift. Please clock out first.';
      END IF;
      
      RETURN NEW;
    END;
    $function$;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      CREATE TRIGGER trg_prevent_duplicate_active_shifts
        BEFORE INSERT OR UPDATE ON public.staff_attendance
        FOR EACH ROW
        WHEN (NEW.shift_status = 'on_shift' AND NEW.clock_out_time IS NULL)
        EXECUTE FUNCTION public.prevent_duplicate_active_shifts();
    END IF;

    -- ============================================================================
    -- 2. HELPER VIEWS
    -- ============================================================================

    -- View: All currently on-shift staff (only if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      -- Drop existing views first
      DROP VIEW IF EXISTS public.active_shifts;
      DROP VIEW IF EXISTS public.todays_attendance;
      
      -- Create view using correct column name
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id') THEN
        CREATE VIEW public.active_shifts AS
        SELECT 
          sa.id,
          sa.profile_id AS user_id,
          sa.company_id,
          sa.site_id,
          sa.clock_in_time,
          sa.shift_notes,
          p.full_name,
          p.email,
          p.app_role,
          s.name AS site_name,
          EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
        FROM public.staff_attendance sa
        JOIN public.profiles p ON p.id = sa.profile_id
        LEFT JOIN public.sites s ON s.id = sa.site_id
        WHERE sa.shift_status = 'on_shift'
          AND sa.clock_out_time IS NULL;

        CREATE OR REPLACE VIEW public.todays_attendance AS
        SELECT 
          sa.*,
          p.full_name,
          p.email,
          p.app_role,
          s.name AS site_name
        FROM public.staff_attendance sa
        JOIN public.profiles p ON p.id = sa.profile_id
        LEFT JOIN public.sites s ON s.id = sa.site_id
        WHERE sa.clock_in_time::date = CURRENT_DATE
        ORDER BY sa.clock_in_time DESC;
      ELSE
        CREATE VIEW public.active_shifts AS
        SELECT 
          sa.id,
          sa.user_id,
          sa.company_id,
          sa.site_id,
          sa.clock_in_time,
          sa.shift_notes,
          p.full_name,
          p.email,
          p.app_role,
          s.name AS site_name,
          EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
        FROM public.staff_attendance sa
        JOIN public.profiles p ON p.id = sa.user_id
        LEFT JOIN public.sites s ON s.id = sa.site_id
        WHERE sa.shift_status = 'on_shift'
          AND sa.clock_out_time IS NULL;

        CREATE OR REPLACE VIEW public.todays_attendance AS
        SELECT 
          sa.*,
          p.full_name,
          p.email,
          p.app_role,
          s.name AS site_name
        FROM public.staff_attendance sa
        JOIN public.profiles p ON p.id = sa.user_id
        LEFT JOIN public.sites s ON s.id = sa.site_id
        WHERE sa.clock_in_time::date = CURRENT_DATE
        ORDER BY sa.clock_in_time DESC;
      END IF;
    END IF;

    -- ============================================================================
    -- 3. HELPER FUNCTIONS
    -- ============================================================================

    -- Drop existing functions first
    DROP FUNCTION IF EXISTS public.get_active_shift(UUID);
    DROP FUNCTION IF EXISTS public.get_staff_on_shift_at_site(UUID);
    DROP FUNCTION IF EXISTS public.auto_clock_out_old_shifts();

    -- Function: Get user's current active shift
    CREATE OR REPLACE FUNCTION public.get_active_shift(p_user_id UUID)
    RETURNS TABLE (
      id UUID,
      user_id UUID,
      company_id UUID,
      site_id UUID,
      clock_in_time TIMESTAMPTZ,
      shift_notes TEXT,
      hours_on_shift DECIMAL
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
        -- Use whichever column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id') THEN
          RETURN QUERY
          SELECT 
            sa.id,
            sa.profile_id AS user_id,
            sa.company_id,
            sa.site_id,
            sa.clock_in_time,
            sa.shift_notes,
            EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
          FROM public.staff_attendance sa
          WHERE sa.profile_id = p_user_id
            AND sa.shift_status = 'on_shift'
            AND sa.clock_out_time IS NULL
          ORDER BY sa.clock_in_time DESC
          LIMIT 1;
        ELSE
          RETURN QUERY
          SELECT 
            sa.id,
            sa.user_id,
            sa.company_id,
            sa.site_id,
            sa.clock_in_time,
            sa.shift_notes,
            EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
          FROM public.staff_attendance sa
          WHERE sa.user_id = p_user_id
            AND sa.shift_status = 'on_shift'
            AND sa.clock_out_time IS NULL
          ORDER BY sa.clock_in_time DESC
          LIMIT 1;
        END IF;
      END IF;
    END;
    $function$;

    -- Function: Get all staff currently on shift at a specific site
    CREATE OR REPLACE FUNCTION public.get_staff_on_shift_at_site(p_site_id UUID)
    RETURNS TABLE (
      user_id UUID,
      full_name TEXT,
      email TEXT,
      app_role TEXT,
      clock_in_time TIMESTAMPTZ,
      hours_on_shift DECIMAL
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
        RETURN QUERY
        SELECT 
          p.id,
          p.full_name,
          p.email,
          p.app_role,
          sa.clock_in_time,
          EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_on_shift
        FROM public.staff_attendance sa
        JOIN public.profiles p ON (
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id')
            THEN p.id = sa.profile_id
            ELSE p.id = sa.user_id
          END
        )
        WHERE sa.site_id = p_site_id
          AND sa.shift_status = 'on_shift'
          AND sa.clock_out_time IS NULL
        ORDER BY sa.clock_in_time DESC;
      END IF;
    END;
    $function$;

    -- Function: Auto clock-out shifts older than 24 hours
    CREATE OR REPLACE FUNCTION public.auto_clock_out_old_shifts()
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      v_count INTEGER := 0;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
        UPDATE public.staff_attendance
        SET 
          clock_out_time = clock_in_time + INTERVAL '24 hours',
          shift_status = 'off_shift',
          total_hours = 24.0,
          shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours]'
        WHERE shift_status = 'on_shift'
          AND clock_out_time IS NULL
          AND clock_in_time < NOW() - INTERVAL '24 hours';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
      END IF;
      RETURN v_count;
    END;
    $function$;

    -- ============================================================================
    -- 4. ROW LEVEL SECURITY POLICIES
    -- ============================================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN
      ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS staff_attendance_select_own ON public.staff_attendance;
      DROP POLICY IF EXISTS staff_attendance_select_company ON public.staff_attendance;
      DROP POLICY IF EXISTS staff_attendance_insert_own ON public.staff_attendance;
      DROP POLICY IF EXISTS staff_attendance_update_own ON public.staff_attendance;
      DROP POLICY IF EXISTS staff_attendance_update_company ON public.staff_attendance;

      -- Staff can view their own attendance records (handles both profile_id and user_id)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id') THEN
        CREATE POLICY staff_attendance_select_own
          ON public.staff_attendance FOR SELECT
          USING (profile_id = auth.uid());
      ELSE
        CREATE POLICY staff_attendance_select_own
          ON public.staff_attendance FOR SELECT
          USING (user_id = auth.uid());
      END IF;

      -- Managers and admins can view all attendance in their company
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE POLICY staff_attendance_select_company
          ON public.staff_attendance FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = staff_attendance.company_id
                AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
            )
          );

        -- Staff can insert their own attendance records (handles both columns)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_attendance' AND column_name = 'profile_id') THEN
          CREATE POLICY staff_attendance_insert_own
            ON public.staff_attendance FOR INSERT
            WITH CHECK (
              profile_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.company_id = staff_attendance.company_id
              )
            );

          CREATE POLICY staff_attendance_update_own
            ON public.staff_attendance FOR UPDATE
            USING (profile_id = auth.uid())
            WITH CHECK (profile_id = auth.uid());
        ELSE
          CREATE POLICY staff_attendance_insert_own
            ON public.staff_attendance FOR INSERT
            WITH CHECK (
              user_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.company_id = staff_attendance.company_id
              )
            );

          CREATE POLICY staff_attendance_update_own
            ON public.staff_attendance FOR UPDATE
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        END IF;

        -- Managers and admins can update attendance in their company
        CREATE POLICY staff_attendance_update_company
          ON public.staff_attendance FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = staff_attendance.company_id
                AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = staff_attendance.company_id
                AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
            )
          );
      END IF;
    END IF;

    -- ============================================================================
    -- 5. GRANT PERMISSIONS
    -- ============================================================================

    -- Grant access to views (if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'active_shifts') THEN
      GRANT SELECT ON public.active_shifts TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'todays_attendance') THEN
      GRANT SELECT ON public.todays_attendance TO authenticated;
    END IF;

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles, companies, sites) do not exist yet - skipping staff_attendance table creation';
  END IF;
END $$;

