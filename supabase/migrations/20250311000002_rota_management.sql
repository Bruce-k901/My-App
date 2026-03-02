-- =============================================
-- ROTA MANAGEMENT SYSTEM
-- Weekly rotas with shifts, templates, and publishing
-- =============================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    -- Rota (a week's schedule for a site)
    CREATE TABLE IF NOT EXISTS rotas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      
      week_starting DATE NOT NULL, -- Always a Monday
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      
      -- Targets
      target_labour_cost INTEGER, -- In pence
      target_labour_percentage DECIMAL(5,2), -- e.g., 28.5%
      target_covers INTEGER, -- Expected customers
      
      -- Calculated (updated by trigger)
      total_hours DECIMAL(6,1) DEFAULT 0,
      total_cost INTEGER DEFAULT 0, -- In pence
      
      -- Publishing
      published_at TIMESTAMPTZ,
      published_by UUID REFERENCES profiles(id),
      
      -- Metadata
      notes TEXT,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      UNIQUE(site_id, week_starting)
    );

    -- Individual shifts on the rota
    CREATE TABLE IF NOT EXISTS rota_shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rota_id UUID NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      
      profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL = unassigned shift
      
      -- Timing
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      
      -- Role/position for this shift
      role_required TEXT, -- e.g., 'Barista', 'Floor', 'Kitchen'
      
      -- Calculated
      gross_hours DECIMAL(4,1) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
      ) STORED,
      net_hours DECIMAL(4,1) GENERATED ALWAYS AS (
        (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) - (break_minutes / 60.0)
      ) STORED,
      
      -- Cost (calculated when assigned)
      hourly_rate INTEGER, -- Snapshot of rate at time of creation
      estimated_cost INTEGER, -- In pence
      
      -- Status
      status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'swapped', 'cancelled', 'completed'
      )),
      
      -- Colour coding in UI
      color TEXT DEFAULT '#6366f1', -- Default indigo
      
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Shift templates (common shift patterns)
    CREATE TABLE IF NOT EXISTS shift_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL = company-wide
      
      name TEXT NOT NULL, -- e.g., 'Morning', 'Evening', 'Close'
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      role_required TEXT,
      color TEXT DEFAULT '#6366f1',
      
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Rota templates (whole week patterns)
    CREATE TABLE IF NOT EXISTS rota_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
      
      name TEXT NOT NULL, -- e.g., 'Standard Week', 'Busy Week', 'Holiday Cover'
      description TEXT,
      
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Shifts within a rota template
    CREATE TABLE IF NOT EXISTS rota_template_shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL REFERENCES rota_templates(id) ON DELETE CASCADE,
      
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      role_required TEXT,
      quantity INTEGER DEFAULT 1, -- How many of this shift needed
      color TEXT DEFAULT '#6366f1'
    );

    -- Seed default shift templates
    CREATE OR REPLACE FUNCTION seed_default_shift_templates(p_company_id UUID)
    RETURNS void AS $func$
    BEGIN
      INSERT INTO shift_templates (company_id, name, start_time, end_time, break_minutes, role_required, color, sort_order)
      VALUES
        (p_company_id, 'Open', '06:00', '14:00', 30, NULL, '#22c55e', 1),
        (p_company_id, 'Morning', '08:00', '16:00', 30, NULL, '#3b82f6', 2),
        (p_company_id, 'Mid', '11:00', '19:00', 30, NULL, '#8b5cf6', 3),
        (p_company_id, 'Evening', '16:00', '00:00', 30, NULL, '#f59e0b', 4),
        (p_company_id, 'Close', '18:00', '02:00', 30, NULL, '#ef4444', 5),
        (p_company_id, 'Split AM', '08:00', '12:00', 0, NULL, '#06b6d4', 6),
        (p_company_id, 'Split PM', '17:00', '21:00', 0, NULL, '#ec4899', 7)
      ON CONFLICT DO NOTHING;
    END;
    $func$ LANGUAGE plpgsql;

    -- Function to calculate shift cost
    CREATE OR REPLACE FUNCTION calculate_shift_cost()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_rate INTEGER;
      v_is_weekend BOOLEAN;
      v_multiplier DECIMAL;
    BEGIN
      IF NEW.profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates') THEN
        -- Get current pay rate
        SELECT base_rate, 
               CASE WHEN EXTRACT(DOW FROM NEW.shift_date) IN (0, 6) 
                    THEN weekend_multiplier ELSE 1.0 END
        INTO v_rate, v_multiplier
        FROM pay_rates 
        WHERE profile_id = NEW.profile_id 
          AND effective_to IS NULL;
        
        NEW.hourly_rate := v_rate;
        NEW.estimated_cost := ROUND(NEW.net_hours * v_rate * v_multiplier);
      ELSE
        NEW.hourly_rate := NULL;
        NEW.estimated_cost := NULL;
      END IF;
      
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER tr_calculate_shift_cost
      BEFORE INSERT OR UPDATE OF profile_id, start_time, end_time, break_minutes
      ON rota_shifts
      FOR EACH ROW
      EXECUTE FUNCTION calculate_shift_cost();

    -- Function to update rota totals
    CREATE OR REPLACE FUNCTION update_rota_totals()
    RETURNS TRIGGER AS $func$
    BEGIN
      UPDATE rotas SET
        total_hours = (
          SELECT COALESCE(SUM(net_hours), 0) 
          FROM rota_shifts 
          WHERE rota_id = COALESCE(NEW.rota_id, OLD.rota_id)
            AND status != 'cancelled'
        ),
        total_cost = (
          SELECT COALESCE(SUM(estimated_cost), 0) 
          FROM rota_shifts 
          WHERE rota_id = COALESCE(NEW.rota_id, OLD.rota_id)
            AND status != 'cancelled'
        ),
        updated_at = NOW()
      WHERE id = COALESCE(NEW.rota_id, OLD.rota_id);
      
      RETURN COALESCE(NEW, OLD);
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER tr_update_rota_totals
      AFTER INSERT OR UPDATE OR DELETE ON rota_shifts
      FOR EACH ROW
      EXECUTE FUNCTION update_rota_totals();

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_rotas_site_week ON rotas(site_id, week_starting);
    CREATE INDEX IF NOT EXISTS idx_rotas_status ON rotas(status);
    CREATE INDEX IF NOT EXISTS idx_rota_shifts_rota ON rota_shifts(rota_id);
    CREATE INDEX IF NOT EXISTS idx_rota_shifts_profile ON rota_shifts(profile_id);
    CREATE INDEX IF NOT EXISTS idx_rota_shifts_date ON rota_shifts(shift_date);
    CREATE INDEX IF NOT EXISTS idx_shift_templates_company ON shift_templates(company_id);
    CREATE INDEX IF NOT EXISTS idx_rota_templates_company ON rota_templates(company_id);

    -- Enable RLS
    ALTER TABLE rotas ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rota_shifts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rota_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rota_template_shifts ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own company rotas" ON rotas;
    DROP POLICY IF EXISTS "Managers can manage rotas" ON rotas;
    DROP POLICY IF EXISTS "Users can view own company shifts" ON rota_shifts;
    DROP POLICY IF EXISTS "Managers can manage shifts" ON rota_shifts;
    DROP POLICY IF EXISTS "Users can view templates" ON shift_templates;
    DROP POLICY IF EXISTS "Managers can manage templates" ON shift_templates;

    -- Policies
    CREATE POLICY "Users can view own company rotas" ON rotas
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage rotas" ON rotas
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    CREATE POLICY "Users can view own company shifts" ON rota_shifts
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage shifts" ON rota_shifts
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    CREATE POLICY "Users can view templates" ON shift_templates
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage templates" ON shift_templates
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    RAISE NOTICE 'Created rota management tables and functions with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, sites) do not exist yet - skipping rota management';
  END IF;
END $$;

