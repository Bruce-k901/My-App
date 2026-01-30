-- Fix All Rota-Related RLS Policies
-- This script fixes RLS issues for rotas, rota_shifts, and rota_forecasts tables
-- The issue is that existing policies use get_user_company_id() which may not work correctly
-- This fix uses direct profile table queries instead
--
-- Run this script to fix all rota-related RLS issues at once

-- ============================================
-- PART 1: Fix ROTAS table
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rotas'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rotas', r.policyname);
        RAISE NOTICE 'Dropped rotas policy: %', r.policyname;
    END LOOP;
END $$;

ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rotas_select_by_company ON public.rotas
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

CREATE POLICY rotas_insert_by_company ON public.rotas
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rotas_update_by_company ON public.rotas
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rotas.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rotas.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rotas_delete_by_company ON public.rotas
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rotas.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'super admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;

-- ============================================
-- PART 2: Fix ROTA_SHIFTS table
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rota_shifts'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rota_shifts', r.policyname);
        RAISE NOTICE 'Dropped rota_shifts policy: %', r.policyname;
    END LOOP;
END $$;

ALTER TABLE public.rota_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rota_shifts_select_by_company ON public.rota_shifts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

CREATE POLICY rota_shifts_insert_by_company ON public.rota_shifts
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rota_shifts_update_by_company ON public.rota_shifts
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rota_shifts_delete_by_company ON public.rota_shifts
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rota_shifts TO authenticated;

-- ============================================
-- PART 3: Fix ROTA_FORECASTS table
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rota_forecasts'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rota_forecasts', r.policyname);
        RAISE NOTICE 'Dropped rota_forecasts policy: %', r.policyname;
    END LOOP;
END $$;

ALTER TABLE public.rota_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rota_forecasts_select_by_company ON public.rota_forecasts
  FOR SELECT
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY rota_forecasts_insert_by_company ON public.rota_forecasts
  FOR INSERT
  WITH CHECK (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rota_forecasts_update_by_company ON public.rota_forecasts
  FOR UPDATE
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  )
  WITH CHECK (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

CREATE POLICY rota_forecasts_delete_by_company ON public.rota_forecasts
  FOR DELETE
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 'owner', 'manager', 'general_manager', 
          'area_manager', 'ops_manager', 'super admin'
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rota_forecasts TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  '=== ROTAS POLICIES ===' as section,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'rotas'
ORDER BY policyname;

SELECT 
  '=== ROTA_SHIFTS POLICIES ===' as section,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'rota_shifts'
ORDER BY policyname;

SELECT 
  '=== ROTA_FORECASTS POLICIES ===' as section,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'rota_forecasts'
ORDER BY policyname;

DO $$
BEGIN
  RAISE NOTICE '✅ All rota-related RLS policies have been fixed!';
END $$;

