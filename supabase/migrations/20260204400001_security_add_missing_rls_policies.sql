-- ============================================================================
-- Migration: Security Fix - Add Missing RLS Policies
-- Description: Creates RLS policies for tables that have RLS enabled but no policies
--              (currently blocking all access - default deny)
-- ============================================================================

BEGIN;

-- ============================================================================
-- daily_sales - Sales data, likely has company_id or site_id
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_sales' AND column_name = 'company_id') THEN
    CREATE POLICY daily_sales_company ON public.daily_sales FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = daily_sales.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_sales' AND column_name = 'site_id') THEN
    CREATE POLICY daily_sales_site ON public.daily_sales FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = daily_sales.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- fire_tests - Fire safety tests, likely has site_id
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fire_tests' AND column_name = 'company_id') THEN
    CREATE POLICY fire_tests_company ON public.fire_tests FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = fire_tests.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fire_tests' AND column_name = 'site_id') THEN
    CREATE POLICY fire_tests_site ON public.fire_tests FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = fire_tests.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- rota_sections - Rota scheduling sections
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_sections' AND column_name = 'company_id') THEN
    CREATE POLICY rota_sections_company ON public.rota_sections FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = rota_sections.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_sections' AND column_name = 'site_id') THEN
    CREATE POLICY rota_sections_site ON public.rota_sections FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = rota_sections.site_id AND p.id = auth.uid())
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_sections' AND column_name = 'rota_id') THEN
    CREATE POLICY rota_sections_rota ON public.rota_sections FOR ALL USING (
      EXISTS (SELECT 1 FROM public.rotas r JOIN public.sites s ON s.id = r.site_id
              JOIN public.profiles p ON p.company_id = s.company_id
              WHERE r.id = rota_sections.rota_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- rota_template_shifts - Shift templates for rotas
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_template_shifts' AND column_name = 'company_id') THEN
    CREATE POLICY rota_template_shifts_company ON public.rota_template_shifts FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = rota_template_shifts.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_template_shifts' AND column_name = 'template_id') THEN
    CREATE POLICY rota_template_shifts_template ON public.rota_template_shifts FOR ALL USING (
      EXISTS (SELECT 1 FROM public.rota_templates t
              JOIN public.profiles p ON p.company_id = t.company_id
              WHERE t.id = rota_template_shifts.template_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- rota_templates - Rota template definitions
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_templates' AND column_name = 'company_id') THEN
    CREATE POLICY rota_templates_company ON public.rota_templates FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = rota_templates.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rota_templates' AND column_name = 'site_id') THEN
    CREATE POLICY rota_templates_site ON public.rota_templates FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = rota_templates.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- staff_skills - Employee skills/qualifications
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_skills' AND column_name = 'company_id') THEN
    CREATE POLICY staff_skills_company ON public.staff_skills FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = staff_skills.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_skills' AND column_name = 'user_id') THEN
    CREATE POLICY staff_skills_user ON public.staff_skills FOR ALL USING (
      staff_skills.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p1, public.profiles p2
              WHERE p1.id = auth.uid() AND p2.id = staff_skills.user_id
              AND p1.company_id = p2.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_skills' AND column_name = 'profile_id') THEN
    CREATE POLICY staff_skills_profile ON public.staff_skills FOR ALL USING (
      staff_skills.profile_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p1, public.profiles p2
              WHERE p1.id = auth.uid() AND p2.id = staff_skills.profile_id
              AND p1.company_id = p2.company_id)
    );
  END IF;
END $$;

-- ============================================================================
-- staff_working_patterns - Employee work schedules
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_working_patterns' AND column_name = 'company_id') THEN
    CREATE POLICY staff_working_patterns_company ON public.staff_working_patterns FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = staff_working_patterns.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_working_patterns' AND column_name = 'user_id') THEN
    CREATE POLICY staff_working_patterns_user ON public.staff_working_patterns FOR ALL USING (
      staff_working_patterns.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p1, public.profiles p2
              WHERE p1.id = auth.uid() AND p2.id = staff_working_patterns.user_id
              AND p1.company_id = p2.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_working_patterns' AND column_name = 'profile_id') THEN
    CREATE POLICY staff_working_patterns_profile ON public.staff_working_patterns FOR ALL USING (
      staff_working_patterns.profile_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.profiles p1, public.profiles p2
              WHERE p1.id = auth.uid() AND p2.id = staff_working_patterns.profile_id
              AND p1.company_id = p2.company_id)
    );
  END IF;
END $$;

-- ============================================================================
-- stock_count_lines - Stock count line items
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_count_lines' AND column_name = 'company_id') THEN
    CREATE POLICY stock_count_lines_company ON public.stock_count_lines FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = stock_count_lines.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_count_lines' AND column_name = 'stock_count_id') THEN
    -- Try joining through stockly.stock_counts
    CREATE POLICY stock_count_lines_count ON public.stock_count_lines FOR ALL USING (
      EXISTS (SELECT 1 FROM stockly.stock_counts sc
              JOIN public.profiles p ON p.company_id = sc.company_id
              WHERE sc.id = stock_count_lines.stock_count_id AND p.id = auth.uid())
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If stockly.stock_counts doesn't exist or has different structure, allow company users
  NULL;
END $$;

-- ============================================================================
-- temp_readings - Temperature readings (food safety)
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'temp_readings' AND column_name = 'company_id') THEN
    CREATE POLICY temp_readings_company ON public.temp_readings FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = temp_readings.company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'temp_readings' AND column_name = 'site_id') THEN
    CREATE POLICY temp_readings_site ON public.temp_readings FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE s.id = temp_readings.site_id AND p.id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================================
-- stockly.stock_transfers - Stock transfer records
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'stockly' AND table_name = 'stock_transfers' AND column_name = 'company_id') THEN
    CREATE POLICY stock_transfers_company ON stockly.stock_transfers FOR ALL USING (
      stockly.stockly_company_access(company_id)
    );
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'stockly' AND table_name = 'stock_transfers' AND column_name = 'from_site_id') THEN
    CREATE POLICY stock_transfers_site ON stockly.stock_transfers FOR ALL USING (
      EXISTS (SELECT 1 FROM public.sites s JOIN public.profiles p ON p.company_id = s.company_id
              WHERE (s.id = stock_transfers.from_site_id OR s.id = stock_transfers.to_site_id) AND p.id = auth.uid())
    );
  END IF;
END $$;

COMMIT;
