-- ============================================================================
-- Migration: Security Fix - Revoke Dangerous Anonymous Grants
-- Severity: CRITICAL
-- Description: Removes SELECT/INSERT/UPDATE/DELETE grants from anonymous role
--              that expose sensitive business data to unauthenticated users
-- ============================================================================

BEGIN;

-- ============================================================================
-- CRITICAL FIX 1: Revoke stockly table access from anon
-- Issue: Unauthenticated users could read supplier, delivery, inventory data
-- ============================================================================

REVOKE SELECT ON stockly.deliveries FROM anon;
REVOKE SELECT ON stockly.delivery_lines FROM anon;
REVOKE SELECT ON stockly.product_variants FROM anon;
REVOKE SELECT ON stockly.stock_items FROM anon;
REVOKE SELECT ON stockly.suppliers FROM anon;

-- Also revoke from stockly schema tables that were granted later
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'ingredient_price_history') THEN
    REVOKE SELECT ON stockly.ingredient_price_history FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stockly' AND table_name = 'stock_movements') THEN
    REVOKE SELECT ON stockly.stock_movements FROM anon;
  END IF;
END $$;

-- ============================================================================
-- CRITICAL FIX 2: Revoke attendance data access from anon
-- Issue: Unauthenticated users could view employee clock-in/out times
-- ============================================================================

-- Revoke from base table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
    REVOKE SELECT ON public.attendance_logs FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'todays_attendance_logs') THEN
    REVOKE SELECT ON public.todays_attendance_logs FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'active_attendance_logs') THEN
    REVOKE SELECT ON public.active_attendance_logs FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'todays_attendance_logs_view') THEN
    REVOKE SELECT ON public.todays_attendance_logs_view FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'active_attendance_logs_view') THEN
    REVOKE SELECT ON public.active_attendance_logs_view FROM anon;
  END IF;
END $$;

-- ============================================================================
-- CRITICAL FIX 3: Revoke stock_levels write access from anon
-- Issue: Unauthenticated users could INSERT/UPDATE/DELETE inventory levels
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_levels') THEN
    REVOKE SELECT, INSERT, UPDATE, DELETE ON public.stock_levels FROM anon;
    -- Grant only SELECT, INSERT, UPDATE to authenticated (no DELETE on stock levels)
    GRANT SELECT, INSERT, UPDATE ON public.stock_levels TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- CRITICAL FIX 4: Revoke price history access from anon
-- Issue: Unauthenticated users could view pricing data
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'ingredient_price_history') THEN
    REVOKE SELECT ON public.ingredient_price_history FROM anon;
    GRANT SELECT ON public.ingredient_price_history TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    REVOKE SELECT ON public.stock_movements FROM anon;
    GRANT SELECT ON public.stock_movements TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- KEEP: Jobs table remains accessible to anon (public job listings)
-- Recruitment system intentionally allows public job viewing
-- ============================================================================

-- Note: GRANT SELECT ON public.jobs TO anon is intentional for public job board

COMMIT;
