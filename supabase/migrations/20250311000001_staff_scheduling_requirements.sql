-- =============================================
-- STAFF SCHEDULING REQUIREMENTS
-- Ensures staff have complete data for rota
-- =============================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Add scheduling fields to profiles
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contracted_hours_per_week DECIMAL(4,1);
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS min_hours_per_week DECIMAL(4,1);
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_hours_per_week DECIMAL(4,1);
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_work_overtime BOOLEAN DEFAULT true;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduling_priority INTEGER DEFAULT 50; -- 1-100, higher = prefer to schedule
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;

    -- Working patterns (which days/times they prefer)
    CREATE TABLE IF NOT EXISTS staff_working_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
      is_available BOOLEAN DEFAULT true,
      preferred_start TIME,
      preferred_end TIME,
      max_hours DECIMAL(4,1),
      notes TEXT,
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(profile_id, day_of_week)
    );

    -- Staff skills/certifications for role matching
    CREATE TABLE IF NOT EXISTS staff_skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      
      skill_name TEXT NOT NULL, -- e.g., 'Barista', 'Floor', 'Kitchen', 'Bar', 'Supervisor'
      proficiency_level INTEGER DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
      can_train_others BOOLEAN DEFAULT false,
      verified_at TIMESTAMPTZ,
      verified_by UUID REFERENCES profiles(id),
      
      created_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(profile_id, skill_name)
    );

    -- Scheduling readiness check
    CREATE OR REPLACE FUNCTION check_staff_scheduling_readiness(p_profile_id UUID)
    RETURNS TABLE (
      is_ready BOOLEAN,
      missing_items TEXT[],
      warnings TEXT[]
    ) AS $func$
    DECLARE
      v_profile RECORD;
      v_missing TEXT[] := '{}';
      v_warnings TEXT[] := '{}';
      v_has_availability BOOLEAN;
      v_has_pay_rate BOOLEAN;
    BEGIN
      -- Get profile
      SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id;
      
      IF NOT FOUND THEN
        RETURN QUERY SELECT false, ARRAY['Profile not found']::TEXT[], ARRAY[]::TEXT[];
        RETURN;
      END IF;
      
      -- Check required fields (make these warnings, not blockers)
      IF v_profile.contracted_hours_per_week IS NULL THEN
        v_warnings := array_append(v_warnings, 'Contracted hours not set');
      END IF;
      
      IF v_profile.home_site IS NULL THEN
        v_warnings := array_append(v_warnings, 'Home site not assigned');
      END IF;
      
      IF v_profile.position_title IS NULL THEN
        v_warnings := array_append(v_warnings, 'Position/role not set');
      END IF;
      
      -- Check availability patterns (warning, not blocker)
      SELECT EXISTS(
        SELECT 1 FROM staff_working_patterns WHERE profile_id = p_profile_id
      ) INTO v_has_availability;
      
      IF NOT v_has_availability THEN
        v_warnings := array_append(v_warnings, 'Availability not set');
      END IF;
      
      -- Check pay rate (only if pay_rates table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates') THEN
        SELECT EXISTS(
          SELECT 1 FROM pay_rates WHERE profile_id = p_profile_id AND effective_to IS NULL
        ) INTO v_has_pay_rate;
        
        IF NOT v_has_pay_rate THEN
          v_warnings := array_append(v_warnings, 'Pay rate not set - costs won''t calculate');
        END IF;
      END IF;
      
      -- Check for skills
      IF NOT EXISTS(SELECT 1 FROM staff_skills WHERE profile_id = p_profile_id) THEN
        v_warnings := array_append(v_warnings, 'No skills assigned - won''t appear in skill filters');
      END IF;
      
      -- Staff is "ready" if they have basic info (name, company, status)
      -- Missing items are just warnings, not blockers
      RETURN QUERY SELECT 
        v_profile.full_name IS NOT NULL AND v_profile.company_id IS NOT NULL,
        v_missing,
        v_warnings;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Get all schedulable staff for a site
    CREATE OR REPLACE FUNCTION get_schedulable_staff(
      p_company_id UUID,
      p_site_id UUID DEFAULT NULL
    )
    RETURNS TABLE (
      id UUID,
      full_name TEXT,
      position_title TEXT,
      avatar_url TEXT,
      contracted_hours DECIMAL,
      min_hours DECIMAL,
      max_hours DECIMAL,
      hourly_rate INTEGER,
      skills TEXT[],
      is_ready BOOLEAN,
      missing_items TEXT[]
    ) AS $func$
    BEGIN
      RETURN QUERY
      SELECT 
        p.id,
        p.full_name,
        p.position_title,
        p.avatar_url,
        p.contracted_hours_per_week,
        p.min_hours_per_week,
        p.max_hours_per_week,
        COALESCE(
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates')
            THEN (SELECT pr.base_rate FROM pay_rates pr WHERE pr.profile_id = p.id AND pr.effective_to IS NULL LIMIT 1)
            ELSE NULL
          END,
          0
        )::INTEGER,
        COALESCE(ARRAY(
          SELECT ss.skill_name 
          FROM staff_skills ss 
          WHERE ss.profile_id = p.id
          ORDER BY ss.proficiency_level DESC
        ), ARRAY[]::TEXT[]) as skills,
        COALESCE((SELECT (check_staff_scheduling_readiness(p.id)).is_ready), false),
        COALESCE((SELECT (check_staff_scheduling_readiness(p.id)).missing_items), ARRAY[]::TEXT[])
      FROM profiles p
      LEFT JOIN (
        SELECT pr.profile_id, pr.base_rate 
        FROM pay_rates pr 
        WHERE pr.effective_to IS NULL
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates')
      ) pr ON pr.profile_id = p.id
      WHERE p.company_id = p_company_id
        AND p.status = 'active'
        AND (p_site_id IS NULL OR p.home_site = p_site_id OR p.home_site IS NULL)
      ORDER BY p.scheduling_priority DESC NULLS LAST, p.full_name;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Enable RLS
    ALTER TABLE staff_working_patterns ENABLE ROW LEVEL SECURITY;
    ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own company patterns" ON staff_working_patterns;
    DROP POLICY IF EXISTS "Managers can manage patterns" ON staff_working_patterns;
    DROP POLICY IF EXISTS "Users can view own company skills" ON staff_skills;
    DROP POLICY IF EXISTS "Managers can manage skills" ON staff_skills;

    CREATE POLICY "Users can view own company patterns" ON staff_working_patterns
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage patterns" ON staff_working_patterns
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    CREATE POLICY "Users can view own company skills" ON staff_skills
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage skills" ON staff_skills
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    RAISE NOTICE 'Created staff scheduling tables and functions with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping staff scheduling requirements';
  END IF;
END $$;

