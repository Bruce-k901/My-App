-- =====================================================
-- PUBLIC HOLIDAYS TABLE
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if companies table exists (for foreign key, even though it's nullable)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN

    CREATE TABLE IF NOT EXISTS public_holidays (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID,
      
      name TEXT NOT NULL,
      date DATE NOT NULL,
      year INTEGER NOT NULL,
      region TEXT DEFAULT 'england',
      is_paid BOOLEAN DEFAULT true,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(company_id, date)
    );

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'public_holidays' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE public_holidays 
      ADD CONSTRAINT public_holidays_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_public_holidays_year ON public_holidays(year);
    CREATE INDEX IF NOT EXISTS idx_public_holidays_date ON public_holidays(date);

    -- RLS
    ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

    -- Only create policy if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      DROP POLICY IF EXISTS "view_public_holidays" ON public_holidays;
      CREATE POLICY "view_public_holidays"
      ON public_holidays FOR SELECT
      USING (
        company_id IS NULL
        OR company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
      );
    END IF;

    -- =====================================================
    -- SEED UK BANK HOLIDAYS 2025
    -- =====================================================

    INSERT INTO public_holidays (company_id, name, date, year, region) VALUES
    (NULL, 'New Year''s Day', '2025-01-01', 2025, 'england'),
    (NULL, 'Good Friday', '2025-04-18', 2025, 'england'),
    (NULL, 'Easter Monday', '2025-04-21', 2025, 'england'),
    (NULL, 'Early May Bank Holiday', '2025-05-05', 2025, 'england'),
    (NULL, 'Spring Bank Holiday', '2025-05-26', 2025, 'england'),
    (NULL, 'Summer Bank Holiday', '2025-08-25', 2025, 'england'),
    (NULL, 'Christmas Day', '2025-12-25', 2025, 'england'),
    (NULL, 'Boxing Day', '2025-12-26', 2025, 'england')
    ON CONFLICT (company_id, date) DO NOTHING;

    -- =====================================================
    -- LEAVE BLACKOUT DATES TABLE
    -- =====================================================

    -- Only create if companies, sites, and profiles tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

      CREATE TABLE IF NOT EXISTS leave_blackout_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        site_id UUID,
        
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        
        applies_to_roles TEXT[],
        allow_manager_override BOOLEAN DEFAULT false,
        is_recurring BOOLEAN DEFAULT false,
        
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        
        CONSTRAINT valid_blackout_dates CHECK (end_date >= start_date)
      );

      -- Add foreign key constraints
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_blackout_dates' 
        AND constraint_name LIKE '%company_id%'
      ) THEN
        ALTER TABLE leave_blackout_dates 
        ADD CONSTRAINT leave_blackout_dates_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_blackout_dates' 
        AND constraint_name LIKE '%site_id%'
      ) THEN
        ALTER TABLE leave_blackout_dates 
        ADD CONSTRAINT leave_blackout_dates_site_id_fkey 
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_blackout_dates' 
        AND constraint_name LIKE '%created_by%'
      ) THEN
        ALTER TABLE leave_blackout_dates 
        ADD CONSTRAINT leave_blackout_dates_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_blackout_dates_company ON leave_blackout_dates(company_id);
      CREATE INDEX IF NOT EXISTS idx_blackout_dates_range ON leave_blackout_dates(start_date, end_date);

      -- RLS
      ALTER TABLE leave_blackout_dates ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "view_blackout_dates" ON leave_blackout_dates;
      DROP POLICY IF EXISTS "manage_blackout_dates" ON leave_blackout_dates;

      CREATE POLICY "view_blackout_dates"
      ON leave_blackout_dates FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
      );

      CREATE POLICY "manage_blackout_dates"
      ON leave_blackout_dates FOR ALL
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
        )
      );

    END IF;

    -- =====================================================
    -- CALCULATE WORKING DAYS FUNCTION
    -- =====================================================

    CREATE OR REPLACE FUNCTION calculate_working_days(
      p_start_date DATE,
      p_end_date DATE,
      p_company_id UUID,
      p_start_half_day BOOLEAN DEFAULT false,
      p_end_half_day BOOLEAN DEFAULT false
    )
    RETURNS DECIMAL AS $function$
    DECLARE
      v_current DATE;
      v_total DECIMAL := 0;
      v_is_holiday BOOLEAN;
      v_region TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_holidays') THEN
        SELECT COALESCE(uk_region, 'england') INTO v_region
        FROM companies WHERE id = p_company_id;
        
        v_current := p_start_date;
        
        WHILE v_current <= p_end_date LOOP
          -- Check if it's a weekend
          IF EXTRACT(DOW FROM v_current) NOT IN (0, 6) THEN
            -- Check if it's a public holiday
            SELECT EXISTS (
              SELECT 1 FROM public_holidays 
              WHERE date = v_current 
              AND (company_id IS NULL OR company_id = p_company_id)
              AND (region = v_region OR region = 'all')
            ) INTO v_is_holiday;
            
            IF NOT v_is_holiday THEN
              IF v_current = p_start_date AND p_start_half_day THEN
                v_total := v_total + 0.5;
              ELSIF v_current = p_end_date AND p_end_half_day THEN
                v_total := v_total + 0.5;
              ELSE
                v_total := v_total + 1;
              END IF;
            END IF;
          END IF;
          
          v_current := v_current + 1;
        END LOOP;
      END IF;
      
      RETURN v_total;
    END;
    $function$ LANGUAGE plpgsql;

    -- =====================================================
    -- CHECK BLACKOUT CONFLICTS FUNCTION
    -- =====================================================

    CREATE OR REPLACE FUNCTION check_blackout_conflict(
      p_profile_id UUID,
      p_start_date DATE,
      p_end_date DATE
    )
    RETURNS TABLE (
      blackout_id UUID,
      blackout_name TEXT,
      blackout_start DATE,
      blackout_end DATE,
      can_override BOOLEAN
    ) AS $function$
    DECLARE
      v_company_id UUID;
      v_site_id UUID;
      v_role TEXT;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_blackout_dates') THEN
        SELECT company_id, site_id, LOWER(app_role::text) as app_role
        INTO v_company_id, v_site_id, v_role
        FROM profiles WHERE id = p_profile_id;
        
        RETURN QUERY
        SELECT 
          bd.id,
          bd.name,
          bd.start_date,
          bd.end_date,
          bd.allow_manager_override
        FROM leave_blackout_dates bd
        WHERE bd.company_id = v_company_id
          AND (bd.site_id IS NULL OR bd.site_id = v_site_id)
          AND (bd.applies_to_roles IS NULL OR v_role = ANY(bd.applies_to_roles))
          AND bd.start_date <= p_end_date
          AND bd.end_date >= p_start_date;
      END IF;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created public_holidays table and related functions';

  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping public_holidays table creation';
  END IF;
END $$;

