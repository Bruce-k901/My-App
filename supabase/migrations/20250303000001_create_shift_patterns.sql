-- =====================================================
-- SHIFT PATTERNS TABLE
-- Reusable shift templates (Morning, Evening, etc.)
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Only proceed if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN

    CREATE TABLE IF NOT EXISTS shift_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID,
      -- NULL site_id = available at all sites
      
      -- Pattern details
      name TEXT NOT NULL,
      short_code TEXT,
      description TEXT,
      
      -- Timing
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      
      -- Break configuration
      break_duration_minutes INTEGER DEFAULT 0,
      paid_break_minutes INTEGER DEFAULT 0,
      
      -- Calculated hours (stored for performance)
      total_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
          WHEN end_time > start_time THEN
            EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (break_duration_minutes::DECIMAL / 60)
          ELSE
            EXTRACT(EPOCH FROM (end_time + INTERVAL '24 hours' - start_time)) / 3600 - (break_duration_minutes::DECIMAL / 60)
        END
      ) STORED,
      
      -- Pay modifiers
      is_premium BOOLEAN DEFAULT false,
      premium_rate_multiplier DECIMAL(3,2) DEFAULT 1.0,
      
      -- Restrictions
      min_staff INTEGER DEFAULT 1,
      max_staff INTEGER,
      requires_role TEXT[],
      
      -- Display
      color TEXT DEFAULT '#6366f1',
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(company_id, site_id, name)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_patterns' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE shift_patterns 
      ADD CONSTRAINT shift_patterns_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Only add site_id foreign key if sites table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'shift_patterns' 
        AND constraint_name LIKE '%site_id%'
      ) THEN
        ALTER TABLE shift_patterns 
        ADD CONSTRAINT shift_patterns_site_id_fkey 
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
      END IF;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_shift_patterns_company ON shift_patterns(company_id);
    CREATE INDEX IF NOT EXISTS idx_shift_patterns_site ON shift_patterns(site_id);
    CREATE INDEX IF NOT EXISTS idx_shift_patterns_active ON shift_patterns(company_id, is_active) WHERE is_active = true;

    -- RLS
    ALTER TABLE shift_patterns ENABLE ROW LEVEL SECURITY;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      DROP POLICY IF EXISTS "view_company_shift_patterns" ON shift_patterns;
      DROP POLICY IF EXISTS "manage_shift_patterns" ON shift_patterns;

      CREATE POLICY "view_company_shift_patterns"
      ON shift_patterns FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
      );

      CREATE POLICY "manage_shift_patterns"
      ON shift_patterns FOR ALL
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
        )
      );
    END IF;

    -- =====================================================
    -- SEED DEFAULT SHIFT PATTERNS
    -- =====================================================

    CREATE OR REPLACE FUNCTION seed_default_shift_patterns(p_company_id UUID)
    RETURNS void AS $function$
    BEGIN
      -- Only proceed if shift_patterns table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns') THEN
        -- Morning shift
        INSERT INTO shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Morning', 'AM', '06:00', '14:00', 30, '#10b981', 1)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
        
        -- Day shift
        INSERT INTO shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Day', 'DAY', '09:00', '17:00', 30, '#3b82f6', 2)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
        
        -- Afternoon shift
        INSERT INTO shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Afternoon', 'AFT', '12:00', '20:00', 30, '#f59e0b', 3)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
        
        -- Evening shift
        INSERT INTO shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Evening', 'PM', '16:00', '00:00', 30, '#8b5cf6', 4)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
        
        -- Close shift
        INSERT INTO shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Close', 'CL', '18:00', '02:00', 30, '#ec4899', 5)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
        
        -- Split shift
        INSERT INTO shift_patterns (company_id, name, short_code, description, start_time, end_time, break_duration_minutes, color, sort_order)
        VALUES (p_company_id, 'Split', 'SP', 'Split shift with break between services', '11:00', '22:00', 180, '#6366f1', 6)
        ON CONFLICT (company_id, site_id, name) DO NOTHING;
      END IF;
    END;
    $function$ LANGUAGE plpgsql;

    -- Trigger for new companies
    CREATE OR REPLACE FUNCTION trigger_seed_shift_patterns()
    RETURNS TRIGGER AS $function$
    BEGIN
      PERFORM seed_default_shift_patterns(NEW.id);
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_new_company_shift_patterns ON companies;
    CREATE TRIGGER trigger_new_company_shift_patterns
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_shift_patterns();

    -- Seed for existing companies
    FOR company_record IN SELECT id FROM companies LOOP
      PERFORM seed_default_shift_patterns(company_record.id);
    END LOOP;

    RAISE NOTICE 'Created shift_patterns table and seeded default patterns';

  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping shift_patterns table creation';
  END IF;
END $$;

