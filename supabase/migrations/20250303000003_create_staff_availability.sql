-- =====================================================
-- STAFF AVAILABILITY TABLE
-- When staff are available/unavailable to work
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS staff_availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Type of availability entry
      availability_type TEXT NOT NULL DEFAULT 'recurring',
      -- Values: 'recurring' (weekly pattern), 'specific' (one-off date), 'exception' (override)
      
      -- For recurring (weekly) availability
      day_of_week INTEGER,
      -- 0 = Sunday, 1 = Monday, ... 6 = Saturday
      
      -- For specific date availability/unavailability
      specific_date DATE,
      
      -- Availability times
      is_available BOOLEAN DEFAULT true,
      available_from TIME,
      available_to TIME,
      
      -- Preferences (soft constraints)
      is_preferred BOOLEAN DEFAULT false,
      max_hours DECIMAL(4,2),
      
      -- Notes
      notes TEXT,
      
      -- Validity period
      effective_from DATE DEFAULT CURRENT_DATE,
      effective_to DATE,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      CONSTRAINT valid_availability_type CHECK (
        availability_type IN ('recurring', 'specific', 'exception')
      ),
      CONSTRAINT recurring_needs_day CHECK (
        availability_type != 'recurring' OR day_of_week IS NOT NULL
      ),
      CONSTRAINT specific_needs_date CHECK (
        availability_type != 'specific' OR specific_date IS NOT NULL
      ),
      CONSTRAINT valid_time_range CHECK (
        available_from IS NULL OR available_to IS NULL OR available_from < available_to
      )
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'staff_availability' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE staff_availability 
      ADD CONSTRAINT staff_availability_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'staff_availability' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE staff_availability 
      ADD CONSTRAINT staff_availability_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_availability_profile ON staff_availability(profile_id);
    CREATE INDEX IF NOT EXISTS idx_availability_recurring ON staff_availability(profile_id, day_of_week) 
      WHERE availability_type = 'recurring';
    CREATE INDEX IF NOT EXISTS idx_availability_specific ON staff_availability(profile_id, specific_date) 
      WHERE availability_type = 'specific';

    -- Prevent duplicate recurring entries
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'staff_availability' 
      AND indexname = 'idx_unique_recurring_availability'
    ) THEN
      CREATE UNIQUE INDEX idx_unique_recurring_availability 
      ON staff_availability(profile_id, day_of_week, available_from)
      WHERE availability_type = 'recurring' AND effective_to IS NULL;
    END IF;

    -- RLS
    ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "manage_own_availability" ON staff_availability;
    DROP POLICY IF EXISTS "managers_view_availability" ON staff_availability;

    -- Staff can manage their own availability
    CREATE POLICY "manage_own_availability"
    ON staff_availability FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can view all availability in company
    CREATE POLICY "managers_view_availability"
    ON staff_availability FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- HELPER FUNCTIONS
    -- =====================================================

    -- Check if a staff member is available at a given time
    CREATE OR REPLACE FUNCTION is_staff_available(
      p_profile_id UUID,
      p_date DATE,
      p_start_time TIME,
      p_end_time TIME
    )
    RETURNS BOOLEAN AS $function$
    DECLARE
      v_day_of_week INTEGER;
      v_availability RECORD;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability') THEN
        RETURN true; -- Default: assume available if table doesn't exist
      END IF;

      v_day_of_week := EXTRACT(DOW FROM p_date);
      
      -- Check for specific date exceptions first (highest priority)
      SELECT * INTO v_availability
      FROM staff_availability
      WHERE profile_id = p_profile_id
        AND availability_type IN ('specific', 'exception')
        AND specific_date = p_date
        AND (effective_from IS NULL OR effective_from <= p_date)
        AND (effective_to IS NULL OR effective_to >= p_date)
      ORDER BY availability_type = 'exception' DESC
      LIMIT 1;
      
      IF FOUND THEN
        IF NOT v_availability.is_available THEN
          RETURN false;
        END IF;
        IF v_availability.available_from IS NOT NULL AND v_availability.available_to IS NOT NULL THEN
          RETURN p_start_time >= v_availability.available_from 
             AND p_end_time <= v_availability.available_to;
        END IF;
        RETURN true;
      END IF;
      
      -- Check recurring availability
      SELECT * INTO v_availability
      FROM staff_availability
      WHERE profile_id = p_profile_id
        AND availability_type = 'recurring'
        AND day_of_week = v_day_of_week
        AND (effective_from IS NULL OR effective_from <= p_date)
        AND (effective_to IS NULL OR effective_to >= p_date)
      LIMIT 1;
      
      IF FOUND THEN
        IF NOT v_availability.is_available THEN
          RETURN false;
        END IF;
        IF v_availability.available_from IS NOT NULL AND v_availability.available_to IS NOT NULL THEN
          RETURN p_start_time >= v_availability.available_from 
             AND p_end_time <= v_availability.available_to;
        END IF;
      END IF;
      
      -- Default: assume available if no restrictions set
      RETURN true;
    END;
    $function$ LANGUAGE plpgsql;

    -- Get availability summary for a week
    CREATE OR REPLACE FUNCTION get_staff_availability_week(
      p_profile_id UUID,
      p_week_start DATE
    )
    RETURNS TABLE (
      day_date DATE,
      day_of_week INTEGER,
      is_available BOOLEAN,
      available_from TIME,
      available_to TIME,
      notes TEXT,
      has_exception BOOLEAN
    ) AS $function$
    DECLARE
      v_current_date DATE;
      v_dow INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability') THEN
        -- Return default availability for all days if table doesn't exist
        FOR i IN 0..6 LOOP
          v_current_date := p_week_start + i;
          v_dow := EXTRACT(DOW FROM v_current_date);
          RETURN QUERY SELECT v_current_date, v_dow, true, NULL::TIME, NULL::TIME, NULL::TEXT, false;
        END LOOP;
        RETURN;
      END IF;

      FOR i IN 0..6 LOOP
        v_current_date := p_week_start + i;
        v_dow := EXTRACT(DOW FROM v_current_date);
        
        RETURN QUERY
        SELECT 
          v_current_date,
          v_dow,
          COALESCE(
            (SELECT sa.is_available FROM staff_availability sa 
             WHERE sa.profile_id = p_profile_id 
               AND ((sa.availability_type = 'specific' AND sa.specific_date = v_current_date)
                    OR (sa.availability_type = 'recurring' AND sa.day_of_week = v_dow))
               AND (sa.effective_from IS NULL OR sa.effective_from <= v_current_date)
               AND (sa.effective_to IS NULL OR sa.effective_to >= v_current_date)
             ORDER BY sa.availability_type = 'specific' DESC
             LIMIT 1),
            true
          ),
          (SELECT sa.available_from FROM staff_availability sa 
           WHERE sa.profile_id = p_profile_id 
             AND ((sa.availability_type = 'specific' AND sa.specific_date = v_current_date)
                  OR (sa.availability_type = 'recurring' AND sa.day_of_week = v_dow))
           ORDER BY sa.availability_type = 'specific' DESC
           LIMIT 1),
          (SELECT sa.available_to FROM staff_availability sa 
           WHERE sa.profile_id = p_profile_id 
             AND ((sa.availability_type = 'specific' AND sa.specific_date = v_current_date)
                  OR (sa.availability_type = 'recurring' AND sa.day_of_week = v_dow))
           ORDER BY sa.availability_type = 'specific' DESC
           LIMIT 1),
          (SELECT sa.notes FROM staff_availability sa 
           WHERE sa.profile_id = p_profile_id 
             AND ((sa.availability_type = 'specific' AND sa.specific_date = v_current_date)
                  OR (sa.availability_type = 'recurring' AND sa.day_of_week = v_dow))
           ORDER BY sa.availability_type = 'specific' DESC
           LIMIT 1),
          EXISTS (
            SELECT 1 FROM staff_availability sa 
            WHERE sa.profile_id = p_profile_id 
              AND sa.availability_type = 'specific' 
              AND sa.specific_date = v_current_date
          );
      END LOOP;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created staff_availability table with functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping staff_availability table creation';
  END IF;
END $$;

