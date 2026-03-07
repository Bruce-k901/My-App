-- ============================================================================
-- Migration: 20260228600000_ensure_shift_patterns_table.sql
-- Description: Ensure shift_patterns table exists. The original migration
--              (20250303000001) was conditional and may have been skipped.
--              This re-runs the CREATE TABLE IF NOT EXISTS unconditionally.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shift_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shift_patterns_company ON public.shift_patterns(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_site ON public.shift_patterns(site_id);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_active ON public.shift_patterns(company_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.shift_patterns ENABLE ROW LEVEL SECURITY;

-- Base policies (view for same company, manage for managers)
DROP POLICY IF EXISTS "view_company_shift_patterns" ON public.shift_patterns;
CREATE POLICY "view_company_shift_patterns" ON public.shift_patterns FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "manage_shift_patterns" ON public.shift_patterns;
CREATE POLICY "manage_shift_patterns" ON public.shift_patterns FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
    )
  );

-- Platform admin bypass (matches_current_tenant includes is_platform_admin check)
DROP POLICY IF EXISTS shift_patterns_tenant_select ON public.shift_patterns;
CREATE POLICY shift_patterns_tenant_select ON public.shift_patterns FOR SELECT
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_patterns_tenant_insert ON public.shift_patterns;
CREATE POLICY shift_patterns_tenant_insert ON public.shift_patterns FOR INSERT
  WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_patterns_tenant_update ON public.shift_patterns;
CREATE POLICY shift_patterns_tenant_update ON public.shift_patterns FOR UPDATE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_patterns_tenant_delete ON public.shift_patterns;
CREATE POLICY shift_patterns_tenant_delete ON public.shift_patterns FOR DELETE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

-- Seed default shift patterns for existing companies that don't have any
INSERT INTO public.shift_patterns (company_id, name, short_code, start_time, end_time, break_duration_minutes, color, sort_order)
SELECT c.id, v.name, v.short_code, v.start_time::TIME, v.end_time::TIME, v.break_mins, v.color, v.sort_order
FROM public.companies c
CROSS JOIN (VALUES
  ('Morning',   'AM',  '06:00', '14:00', 30, '#10b981', 1),
  ('Day',       'DAY', '09:00', '17:00', 30, '#3b82f6', 2),
  ('Afternoon', 'AFT', '12:00', '20:00', 30, '#f59e0b', 3),
  ('Evening',   'PM',  '16:00', '00:00', 30, '#8b5cf6', 4),
  ('Close',     'CL',  '18:00', '02:00', 30, '#ec4899', 5)
) AS v(name, short_code, start_time, end_time, break_mins, color, sort_order)
ON CONFLICT (company_id, site_id, name) DO NOTHING;

-- Notify PostgREST to reload schema (picks up new table)
NOTIFY pgrst, 'reload schema';
