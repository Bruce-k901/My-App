-- Migration: Fix RLS Per-Row Evaluation Performance Issues
-- Priority: CRITICAL
-- Issue: auth.uid() and subqueries in RLS policies are re-evaluated for every row
-- Solution: Use subquery wrappers and cached functions to force single evaluation
--
-- Technique: Wrapping (SELECT auth.uid()) forces PostgreSQL to evaluate once
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#performance

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Ensure user_company_id function exists and is optimized
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
    v_cached TEXT;
BEGIN
    -- Try to get from session cache first
    BEGIN
        v_cached := current_setting('app.user_company_id', true);
        IF v_cached IS NOT NULL AND v_cached != '' THEN
            RETURN v_cached::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Fetch from profiles (check both id and auth_user_id)
    SELECT p.company_id INTO v_company_id
    FROM public.profiles p
    WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    LIMIT 1;

    -- Cache for this transaction
    IF v_company_id IS NOT NULL THEN
        PERFORM set_config('app.user_company_id', v_company_id::TEXT, true);
    END IF;

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;

-- ============================================
-- HELPER: Create company-based RLS policy safely
-- Only creates if table exists and has company_id column
-- ============================================

CREATE OR REPLACE FUNCTION temp_create_company_rls(
    p_table_name TEXT,
    p_schema TEXT DEFAULT 'public'
) RETURNS VOID AS $$
DECLARE
    v_full_table TEXT;
BEGIN
    v_full_table := p_schema || '.' || p_table_name;

    -- Check if table exists and has company_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_schema
        AND table_name = p_table_name
        AND column_name = 'company_id'
    ) THEN
        RETURN;
    END IF;

    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %s', p_table_name, v_full_table);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %s', p_table_name, v_full_table);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %s', p_table_name, v_full_table);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %s', p_table_name, v_full_table);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON %s', p_table_name, v_full_table);
    EXECUTE format('DROP POLICY IF EXISTS "%s_company" ON %s', p_table_name, v_full_table);

    -- Create optimized policy using cached function
    EXECUTE format('CREATE POLICY "%s_company" ON %s FOR ALL USING (company_id = public.user_company_id())',
                   p_table_name, v_full_table);

    RAISE NOTICE 'Created optimized RLS policy for %', v_full_table;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIX STOCKLY.STOCK_TRANSFERS RLS POLICIES
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'stockly' AND table_name = 'stock_transfers' AND column_name = 'company_id'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view stock transfers" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "Users can create stock transfers" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "Users can update stock transfers" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "stock_transfers_select" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "stock_transfers_insert" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "stock_transfers_update" ON stockly.stock_transfers;
        DROP POLICY IF EXISTS "stock_transfers_company" ON stockly.stock_transfers;

        -- Create optimized policies
        CREATE POLICY "stock_transfers_company" ON stockly.stock_transfers
            FOR ALL USING (company_id = public.user_company_id());
    END IF;
END $$;

-- ============================================
-- FIX TABLES WITH company_id COLUMN
-- ============================================

SELECT temp_create_company_rls('departments');
SELECT temp_create_company_rls('regions');
SELECT temp_create_company_rls('areas');
SELECT temp_create_company_rls('approval_workflows');
SELECT temp_create_company_rls('support_tickets');
SELECT temp_create_company_rls('daily_sales');
SELECT temp_create_company_rls('fire_tests');
SELECT temp_create_company_rls('rota_sections');
SELECT temp_create_company_rls('rota_templates');
SELECT temp_create_company_rls('rota_template_shifts');
SELECT temp_create_company_rls('staff_skills');
SELECT temp_create_company_rls('staff_working_patterns');
SELECT temp_create_company_rls('stock_count_lines');
SELECT temp_create_company_rls('temp_readings');
SELECT temp_create_company_rls('ppm_service_events');
SELECT temp_create_company_rls('service_reports');
SELECT temp_create_company_rls('order_book_message_threads');
SELECT temp_create_company_rls('order_book_messages');
SELECT temp_create_company_rls('order_book_issues');
SELECT temp_create_company_rls('order_book_issue_comments');
SELECT temp_create_company_rls('order_book_product_ratings');
SELECT temp_create_company_rls('order_book_credit_requests');
SELECT temp_create_company_rls('credit_note_requests');
SELECT temp_create_company_rls('credit_note_lines');
SELECT temp_create_company_rls('course_assignments');
SELECT temp_create_company_rls('calendar_reminders');

-- ============================================
-- FIX STAFF_ATTENDANCE RLS POLICIES
-- Uses profile_id for ownership, company_id for company access
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_attendance') THEN
        -- Drop existing problematic policies
        DROP POLICY IF EXISTS "staff_attendance_select_own" ON staff_attendance;
        DROP POLICY IF EXISTS "staff_attendance_update_own" ON staff_attendance;
        DROP POLICY IF EXISTS "staff_attendance_company" ON staff_attendance;
        DROP POLICY IF EXISTS "Users can view own attendance" ON staff_attendance;
        DROP POLICY IF EXISTS "Users can update own attendance" ON staff_attendance;

        -- Check if company_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'staff_attendance' AND column_name = 'company_id'
        ) THEN
            -- Company-wide policy for managers (using cached function)
            CREATE POLICY "staff_attendance_company" ON staff_attendance
                FOR ALL USING (company_id = public.user_company_id());
        END IF;

        -- Ownership policy using subquery wrapper
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'staff_attendance' AND column_name = 'profile_id'
        ) THEN
            CREATE POLICY "staff_attendance_own" ON staff_attendance
                FOR SELECT USING (profile_id = (SELECT auth.uid()));
        END IF;
    END IF;
END $$;

-- ============================================
-- CLEANUP: Drop temp function
-- ============================================

DROP FUNCTION IF EXISTS temp_create_company_rls(TEXT, TEXT);

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION public.user_company_id() IS
'Returns the authenticated user''s company_id with session caching.
This function caches the result in a session variable to prevent
repeated profile lookups in RLS policies. Used to optimize RLS
performance by avoiding per-row evaluation of company access checks.';
