-- ============================================================================
-- Migration: Security Fix - Set search_path on Functions
-- Description: Sets search_path to prevent search path injection attacks
--              Especially important for SECURITY DEFINER functions
-- ============================================================================

BEGIN;

-- ============================================================================
-- Fix stockly schema functions
-- ============================================================================

-- stockly_company_access
ALTER FUNCTION stockly.stockly_company_access(UUID) SET search_path = public, stockly;

-- Recipe functions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'calculate_recipe_cost') THEN
    ALTER FUNCTION stockly.calculate_recipe_cost(UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'recalculate_all_recipes') THEN
    ALTER FUNCTION stockly.recalculate_all_recipes(UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'get_recipe_cost_breakdown') THEN
    ALTER FUNCTION stockly.get_recipe_cost_breakdown(UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'trigger_recalculate_recipe') THEN
    ALTER FUNCTION stockly.trigger_recalculate_recipe() SET search_path = public, stockly;
  END IF;
END $$;

-- RBAC functions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'get_user_role') THEN
    ALTER FUNCTION stockly.get_user_role(UUID, UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'role_has_permission') THEN
    ALTER FUNCTION stockly.role_has_permission(TEXT, TEXT) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'stockly_company_access_with_role') THEN
    ALTER FUNCTION stockly.stockly_company_access_with_role(UUID, TEXT) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'is_manager_or_above') THEN
    ALTER FUNCTION stockly.is_manager_or_above(UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'is_admin_or_above') THEN
    ALTER FUNCTION stockly.is_admin_or_above(UUID) SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'stockly' AND p.proname = 'is_owner') THEN
    ALTER FUNCTION stockly.is_owner(UUID) SET search_path = public, stockly;
  END IF;
END $$;

-- ============================================================================
-- Fix public schema trigger functions
-- ============================================================================

-- Stock levels triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_stock_levels') THEN
    ALTER FUNCTION public.insert_stock_levels() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_stock_levels') THEN
    ALTER FUNCTION public.update_stock_levels() SET search_path = public, stockly;
  END IF;
END $$;

-- Sales triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_daily_sales_summary') THEN
    ALTER FUNCTION public.insert_daily_sales_summary() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_daily_sales_summary') THEN
    ALTER FUNCTION public.update_daily_sales_summary() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_sales_imports') THEN
    ALTER FUNCTION public.insert_sales_imports() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_sales_imports') THEN
    ALTER FUNCTION public.update_sales_imports() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_sales') THEN
    ALTER FUNCTION public.insert_sales() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_sales') THEN
    ALTER FUNCTION public.update_sales() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_sale_items') THEN
    ALTER FUNCTION public.insert_sale_items() SET search_path = public, stockly;
  END IF;
END $$;

-- Recipe triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_recipes') THEN
    ALTER FUNCTION public.insert_recipes() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_recipes') THEN
    ALTER FUNCTION public.update_recipes() SET search_path = public, stockly;
  END IF;
END $$;

-- Delivery triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'insert_deliveries') THEN
    ALTER FUNCTION public.insert_deliveries() SET search_path = public, stockly;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_deliveries') THEN
    ALTER FUNCTION public.update_deliveries() SET search_path = public, stockly;
  END IF;
END $$;

-- ============================================================================
-- Bulk fix: Set search_path on ALL SECURITY DEFINER functions
-- This catches any we might have missed
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    alter_stmt TEXT;
BEGIN
    FOR func_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosecdef = true  -- SECURITY DEFINER functions
        AND n.nspname IN ('public', 'stockly')
        AND p.proconfig IS NULL OR NOT (p.proconfig::text[] @> ARRAY['search_path=public, stockly'])
    LOOP
        BEGIN
            alter_stmt := format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = public, stockly',
                func_record.schema_name,
                func_record.func_name,
                func_record.func_args
            );
            EXECUTE alter_stmt;
        EXCEPTION WHEN OTHERS THEN
            -- Log but continue if a specific function fails
            RAISE NOTICE 'Could not alter function %.%: %',
                func_record.schema_name, func_record.func_name, SQLERRM;
        END;
    END LOOP;
END $$;

COMMIT;
