-- ============================================================================
-- Migration: 20260203500000_create_planly_production_tables.sql
-- Description: Creates planly_processing_groups and planly_equipment_types tables
-- for the Opsly production planning system
-- ============================================================================

-- ============================================================================
-- EQUIPMENT TYPES TABLE
-- Defines physical equipment used for baking/production (trays, racks, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS planly_equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,  -- NULL = company-wide
  name VARCHAR(100) NOT NULL,
  default_capacity INTEGER NOT NULL CHECK (default_capacity > 0),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for equipment type names (using COALESCE for NULL site_id handling)
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_types_name_unique
  ON planly_equipment_types(company_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_equipment_types_company ON planly_equipment_types(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_types_site_active ON planly_equipment_types(site_id, is_active) WHERE is_active = true;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_equipment_types_updated_at ON planly_equipment_types;
CREATE TRIGGER update_equipment_types_updated_at
  BEFORE UPDATE ON planly_equipment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE planly_equipment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_types_select" ON planly_equipment_types;
CREATE POLICY "equipment_types_select" ON planly_equipment_types FOR SELECT
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_equipment_types.company_id
    ))
  );

DROP POLICY IF EXISTS "equipment_types_insert" ON planly_equipment_types;
CREATE POLICY "equipment_types_insert" ON planly_equipment_types FOR INSERT
  WITH CHECK (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_equipment_types.company_id
    ))
  );

DROP POLICY IF EXISTS "equipment_types_update" ON planly_equipment_types;
CREATE POLICY "equipment_types_update" ON planly_equipment_types FOR UPDATE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_equipment_types.company_id
    ))
  );

DROP POLICY IF EXISTS "equipment_types_delete" ON planly_equipment_types;
CREATE POLICY "equipment_types_delete" ON planly_equipment_types FOR DELETE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_equipment_types.company_id
    ))
  );

-- ============================================================================
-- PROCESSING GROUPS TABLE
-- Groups products by shared base prep recipe and batch parameters
-- ============================================================================

CREATE TABLE IF NOT EXISTS planly_processing_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,  -- NULL = company-wide
  name VARCHAR(100) NOT NULL,
  base_prep_recipe_id UUID NOT NULL,  -- FK to stockly.recipes (validated at app level)
  batch_size_kg DECIMAL(10,3) NOT NULL CHECK (batch_size_kg > 0),
  units_per_batch INTEGER NOT NULL CHECK (units_per_batch > 0),
  rounding_method VARCHAR(20) NOT NULL DEFAULT 'up' CHECK (rounding_method IN ('up', 'nearest', 'exact')),
  leftover_handling VARCHAR(50) CHECK (leftover_handling IN ('preferment', 'waste', 'staff_meals', 'next_batch')),
  process_template_id UUID REFERENCES planly_process_templates(id) ON DELETE SET NULL,
  sop_id UUID,  -- FK to sop_entries (validated at app level, cross-schema)
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for processing group names
CREATE UNIQUE INDEX IF NOT EXISTS idx_processing_groups_name_unique
  ON planly_processing_groups(company_id, COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Add FK to sop_entries if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_entries') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'planly_processing_groups_sop_id_fkey'
    ) THEN
      ALTER TABLE planly_processing_groups
        ADD CONSTRAINT planly_processing_groups_sop_id_fkey
        FOREIGN KEY (sop_id) REFERENCES sop_entries(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_processing_groups_company ON planly_processing_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_processing_groups_site_active ON planly_processing_groups(site_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_processing_groups_recipe ON planly_processing_groups(base_prep_recipe_id);
CREATE INDEX IF NOT EXISTS idx_processing_groups_template ON planly_processing_groups(process_template_id) WHERE process_template_id IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_processing_groups_updated_at ON planly_processing_groups;
CREATE TRIGGER update_processing_groups_updated_at
  BEFORE UPDATE ON planly_processing_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE planly_processing_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processing_groups_select" ON planly_processing_groups;
CREATE POLICY "processing_groups_select" ON planly_processing_groups FOR SELECT
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_processing_groups.company_id
    ))
  );

DROP POLICY IF EXISTS "processing_groups_insert" ON planly_processing_groups;
CREATE POLICY "processing_groups_insert" ON planly_processing_groups FOR INSERT
  WITH CHECK (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_processing_groups.company_id
    ))
  );

DROP POLICY IF EXISTS "processing_groups_update" ON planly_processing_groups;
CREATE POLICY "processing_groups_update" ON planly_processing_groups FOR UPDATE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_processing_groups.company_id
    ))
  );

DROP POLICY IF EXISTS "processing_groups_delete" ON planly_processing_groups;
CREATE POLICY "processing_groups_delete" ON planly_processing_groups FOR DELETE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND EXISTS (
      SELECT 1 FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = planly_processing_groups.company_id
    ))
  );

-- ============================================================================
-- PRODUCTION PLAN OVERRIDES TABLE
-- For adding extra quantities (R&D, staff meals, sampling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS planly_production_plan_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  production_date DATE NOT NULL,
  processing_group_id UUID NOT NULL REFERENCES planly_processing_groups(id) ON DELETE CASCADE,
  extra_quantity_kg DECIMAL(10,3) NOT NULL CHECK (extra_quantity_kg > 0),
  reason VARCHAR(200),  -- 'R&D', 'Staff meals', 'Sampling', etc.
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, production_date, processing_group_id)
);

-- Indexes (conditionally create if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planly_production_plan_overrides' AND column_name = 'site_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_overrides_site_date ON planly_production_plan_overrides(site_id, production_date);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planly_production_plan_overrides' AND column_name = 'processing_group_id') THEN
    CREATE INDEX IF NOT EXISTS idx_production_overrides_group ON planly_production_plan_overrides(processing_group_id);
  END IF;
END $$;

-- RLS (only if site_id column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planly_production_plan_overrides' AND column_name = 'site_id') THEN
    ALTER TABLE planly_production_plan_overrides ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "production_overrides_select" ON planly_production_plan_overrides;
    CREATE POLICY "production_overrides_select" ON planly_production_plan_overrides FOR SELECT
      USING (has_planly_site_access(site_id));

    DROP POLICY IF EXISTS "production_overrides_insert" ON planly_production_plan_overrides;
    CREATE POLICY "production_overrides_insert" ON planly_production_plan_overrides FOR INSERT
      WITH CHECK (has_planly_site_access(site_id));

    DROP POLICY IF EXISTS "production_overrides_update" ON planly_production_plan_overrides;
    CREATE POLICY "production_overrides_update" ON planly_production_plan_overrides FOR UPDATE
      USING (has_planly_site_access(site_id));

    DROP POLICY IF EXISTS "production_overrides_delete" ON planly_production_plan_overrides;
    CREATE POLICY "production_overrides_delete" ON planly_production_plan_overrides FOR DELETE
      USING (has_planly_site_access(site_id));
  END IF;
END $$;
