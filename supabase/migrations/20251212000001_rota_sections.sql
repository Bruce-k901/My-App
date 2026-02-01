-- =============================================
-- ROTA SECTIONS
-- Allow categorising shifts into sections (FOH/BOH/Bar/etc.)
-- =============================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rotas')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_shifts') THEN

    CREATE TABLE IF NOT EXISTS rota_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#EC4899',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, site_id, name)
    );

    -- Link shifts to sections
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rota_shifts' AND column_name = 'section_id'
    ) THEN
      ALTER TABLE rota_shifts ADD COLUMN section_id UUID;
    END IF;

    -- Add FK (idempotently)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'rota_shifts'
        AND constraint_name = 'rota_shifts_section_id_fkey'
    ) THEN
      ALTER TABLE rota_shifts
        ADD CONSTRAINT rota_shifts_section_id_fkey
        FOREIGN KEY (section_id) REFERENCES rota_sections(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_rota_sections_site_order ON rota_sections(site_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_rota_shifts_section ON rota_shifts(section_id);

    -- Enable RLS
    ALTER TABLE rota_sections ENABLE ROW LEVEL SECURITY;

    -- Policies
    DROP POLICY IF EXISTS "Users can view own company rota sections" ON rota_sections;
    DROP POLICY IF EXISTS "Managers can manage rota sections" ON rota_sections;

    CREATE POLICY "Users can view own company rota sections" ON rota_sections
      FOR SELECT USING (
        company_id = public.get_user_company_id()
      );

    CREATE POLICY "Managers can manage rota sections" ON rota_sections
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND LOWER(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager')
      );

    -- Seed defaults per site (idempotent)
    INSERT INTO rota_sections (company_id, site_id, name, sort_order, color)
    SELECT
      s.company_id,
      s.id,
      v.name,
      v.sort_order,
      v.color
    FROM sites s
    CROSS JOIN (VALUES
      ('FOH', 1, '#EC4899'),
      ('BOH', 2, '#22c55e'),
      ('Bar', 3, '#3b82f6'),
      ('Reservations', 4, '#f59e0b'),
      ('Host', 5, '#8b5cf6'),
      ('Porters', 6, '#64748b')
    ) AS v(name, sort_order, color)
    WHERE NOT EXISTS (
      SELECT 1 FROM rota_sections rs
      WHERE rs.company_id = s.company_id AND rs.site_id = s.id AND LOWER(rs.name) = LOWER(v.name)
    );

    RAISE NOTICE 'Created rota_sections and linked rota_shifts.section_id';
  ELSE
    RAISE NOTICE '⚠️ Required tables do not exist yet - skipping rota sections migration';
  END IF;
END $$;


