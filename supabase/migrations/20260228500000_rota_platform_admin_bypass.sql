-- ============================================================================
-- Migration: 20260228500000_rota_platform_admin_bypass.sql
-- Description: Add matches_current_tenant() policies to all rota-related tables
--              so platform admins can access rotas for any company (View As mode).
--              Existing policies remain intact. These new policies add
--              tenant-scoped + platform admin bypass.
-- ============================================================================

-- ---------------------------------------------------------------
-- 1. rotas (has company_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS rotas_tenant_select ON public.rotas;
CREATE POLICY rotas_tenant_select ON public.rotas FOR SELECT
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rotas_tenant_insert ON public.rotas;
CREATE POLICY rotas_tenant_insert ON public.rotas FOR INSERT
  WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rotas_tenant_update ON public.rotas;
CREATE POLICY rotas_tenant_update ON public.rotas FOR UPDATE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rotas_tenant_delete ON public.rotas;
CREATE POLICY rotas_tenant_delete ON public.rotas FOR DELETE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

-- ---------------------------------------------------------------
-- 2. rota_shifts (has company_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS rota_shifts_tenant_select ON public.rota_shifts;
CREATE POLICY rota_shifts_tenant_select ON public.rota_shifts FOR SELECT
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rota_shifts_tenant_insert ON public.rota_shifts;
CREATE POLICY rota_shifts_tenant_insert ON public.rota_shifts FOR INSERT
  WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rota_shifts_tenant_update ON public.rota_shifts;
CREATE POLICY rota_shifts_tenant_update ON public.rota_shifts FOR UPDATE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS rota_shifts_tenant_delete ON public.rota_shifts;
CREATE POLICY rota_shifts_tenant_delete ON public.rota_shifts FOR DELETE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

-- ---------------------------------------------------------------
-- 3. shift_templates (has company_id)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS shift_templates_tenant_select ON public.shift_templates;
CREATE POLICY shift_templates_tenant_select ON public.shift_templates FOR SELECT
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_templates_tenant_insert ON public.shift_templates;
CREATE POLICY shift_templates_tenant_insert ON public.shift_templates FOR INSERT
  WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_templates_tenant_update ON public.shift_templates;
CREATE POLICY shift_templates_tenant_update ON public.shift_templates FOR UPDATE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

DROP POLICY IF EXISTS shift_templates_tenant_delete ON public.shift_templates;
CREATE POLICY shift_templates_tenant_delete ON public.shift_templates FOR DELETE
  USING (public.is_service_role() OR public.matches_current_tenant(company_id));

-- ---------------------------------------------------------------
-- 4. rota_templates (has company_id)
-- ---------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_templates') THEN
    DROP POLICY IF EXISTS rota_templates_tenant_select ON public.rota_templates;
    CREATE POLICY rota_templates_tenant_select ON public.rota_templates FOR SELECT
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_templates_tenant_insert ON public.rota_templates;
    CREATE POLICY rota_templates_tenant_insert ON public.rota_templates FOR INSERT
      WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_templates_tenant_update ON public.rota_templates;
    CREATE POLICY rota_templates_tenant_update ON public.rota_templates FOR UPDATE
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_templates_tenant_delete ON public.rota_templates;
    CREATE POLICY rota_templates_tenant_delete ON public.rota_templates FOR DELETE
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 5. rota_sections (has company_id)
-- ---------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_sections') THEN
    DROP POLICY IF EXISTS rota_sections_tenant_select ON public.rota_sections;
    CREATE POLICY rota_sections_tenant_select ON public.rota_sections FOR SELECT
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_sections_tenant_insert ON public.rota_sections;
    CREATE POLICY rota_sections_tenant_insert ON public.rota_sections FOR INSERT
      WITH CHECK (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_sections_tenant_update ON public.rota_sections;
    CREATE POLICY rota_sections_tenant_update ON public.rota_sections FOR UPDATE
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));

    DROP POLICY IF EXISTS rota_sections_tenant_delete ON public.rota_sections;
    CREATE POLICY rota_sections_tenant_delete ON public.rota_sections FOR DELETE
      USING (public.is_service_role() OR public.matches_current_tenant(company_id));
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 6. shift_patterns (has company_id)
-- ---------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns') THEN
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
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7. rota_forecasts (no company_id — linked via rota_id → rotas)
-- ---------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_forecasts') THEN
    DROP POLICY IF EXISTS rota_forecasts_tenant_select ON public.rota_forecasts;
    CREATE POLICY rota_forecasts_tenant_select ON public.rota_forecasts FOR SELECT
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_forecasts.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_forecasts_tenant_insert ON public.rota_forecasts;
    CREATE POLICY rota_forecasts_tenant_insert ON public.rota_forecasts FOR INSERT
      WITH CHECK (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_forecasts_tenant_update ON public.rota_forecasts;
    CREATE POLICY rota_forecasts_tenant_update ON public.rota_forecasts FOR UPDATE
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_forecasts.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_forecasts_tenant_delete ON public.rota_forecasts;
    CREATE POLICY rota_forecasts_tenant_delete ON public.rota_forecasts FOR DELETE
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_forecasts.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7. rota_day_approvals (no company_id — linked via rota_id → rotas)
-- ---------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_day_approvals') THEN
    DROP POLICY IF EXISTS rota_day_approvals_tenant_select ON public.rota_day_approvals;
    CREATE POLICY rota_day_approvals_tenant_select ON public.rota_day_approvals FOR SELECT
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_day_approvals.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_day_approvals_tenant_insert ON public.rota_day_approvals;
    CREATE POLICY rota_day_approvals_tenant_insert ON public.rota_day_approvals FOR INSERT
      WITH CHECK (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_day_approvals_tenant_update ON public.rota_day_approvals;
    CREATE POLICY rota_day_approvals_tenant_update ON public.rota_day_approvals FOR UPDATE
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_day_approvals.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );

    DROP POLICY IF EXISTS rota_day_approvals_tenant_delete ON public.rota_day_approvals;
    CREATE POLICY rota_day_approvals_tenant_delete ON public.rota_day_approvals FOR DELETE
      USING (
        public.is_service_role()
        OR EXISTS (
          SELECT 1 FROM public.rotas r
          WHERE r.id = rota_day_approvals.rota_id
            AND public.matches_current_tenant(r.company_id)
        )
      );
  END IF;
END $$;
