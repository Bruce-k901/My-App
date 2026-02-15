-- ============================================================================
-- Migration: Security Fix - Set search_path on ALL Functions
-- Description: Sets search_path on all functions in public and stockly schemas
--              to prevent search path injection attacks
-- ============================================================================

BEGIN;

-- ============================================================================
-- Bulk fix: Set search_path on ALL functions in public and stockly schemas
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    alter_stmt TEXT;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
BEGIN
    FOR func_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as func_args,
            p.oid as func_oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'stockly')
        -- Exclude functions that already have search_path set
        AND (p.proconfig IS NULL
             OR NOT EXISTS (
                 SELECT 1 FROM unnest(p.proconfig) AS cfg
                 WHERE cfg LIKE 'search_path=%'
             ))
        -- Exclude aggregate functions
        AND p.prokind = 'f'
    LOOP
        BEGIN
            alter_stmt := format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = public, stockly',
                func_record.schema_name,
                func_record.func_name,
                func_record.func_args
            );
            EXECUTE alter_stmt;
            success_count := success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            fail_count := fail_count + 1;
            RAISE NOTICE 'Could not alter function %.%(%): %',
                func_record.schema_name, func_record.func_name,
                func_record.func_args, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Successfully updated % functions, % failed', success_count, fail_count;
END $$;

-- ============================================================================
-- Also fix procedure search_paths (if any exist)
-- ============================================================================

DO $$
DECLARE
    proc_record RECORD;
    alter_stmt TEXT;
BEGIN
    FOR proc_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as proc_name,
            pg_get_function_identity_arguments(p.oid) as proc_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname IN ('public', 'stockly')
        AND p.prokind = 'p'  -- Procedures
        AND (p.proconfig IS NULL
             OR NOT EXISTS (
                 SELECT 1 FROM unnest(p.proconfig) AS cfg
                 WHERE cfg LIKE 'search_path=%'
             ))
    LOOP
        BEGIN
            alter_stmt := format(
                'ALTER PROCEDURE %I.%I(%s) SET search_path = public, stockly',
                proc_record.schema_name,
                proc_record.proc_name,
                proc_record.proc_args
            );
            EXECUTE alter_stmt;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter procedure %.%: %',
                proc_record.schema_name, proc_record.proc_name, SQLERRM;
        END;
    END LOOP;
END $$;

COMMIT;
