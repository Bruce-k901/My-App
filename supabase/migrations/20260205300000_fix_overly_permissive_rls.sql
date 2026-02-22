-- Migration: Fix Overly Permissive RLS Policies
-- Priority: HIGH (Security)
-- Issue: Several policies use USING(true) or WITH CHECK(true) for DELETE/UPDATE/INSERT
-- Solution: Replace with proper company-based access checks using cached function

-- ============================================
-- FIX PURCHASE ORDERS DELETE POLICIES
-- These currently allow any authenticated user to delete any PO
-- ============================================

DO $$
BEGIN
    -- Drop the overly permissive DELETE policies
    DROP POLICY IF EXISTS "Allow delete purchase order lines" ON public.purchase_order_lines;
    DROP POLICY IF EXISTS "Allow delete purchase orders" ON public.purchase_orders;

    -- Check if tables exist and have company_id before creating policies
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'company_id'
    ) THEN
        -- Create proper DELETE policy for purchase_orders
        CREATE POLICY "purchase_orders_delete_company"
            ON public.purchase_orders
            FOR DELETE
            TO authenticated
            USING (company_id = public.user_company_id());

        RAISE NOTICE 'Fixed purchase_orders DELETE policy';
    END IF;

    -- purchase_order_lines needs to check via purchase_orders
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'purchase_order_lines'
    ) THEN
        -- Create DELETE policy that joins to purchase_orders for company check
        CREATE POLICY "purchase_order_lines_delete_company"
            ON public.purchase_order_lines
            FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.purchase_orders po
                    WHERE po.id = purchase_order_lines.purchase_order_id
                    AND po.company_id = public.user_company_id()
                )
            );

        RAISE NOTICE 'Fixed purchase_order_lines DELETE policy';
    END IF;
END $$;

-- ============================================
-- FIX EMPLOYEE REVIEW SUMMARY POLICIES
-- These currently allow any authenticated user to INSERT/UPDATE any summary
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employee_review_summary' AND column_name = 'company_id'
    ) THEN
        -- Drop overly permissive policies
        DROP POLICY IF EXISTS "insert_employee_review_summary" ON public.employee_review_summary;
        DROP POLICY IF EXISTS "update_employee_review_summary" ON public.employee_review_summary;

        -- Create proper INSERT policy
        CREATE POLICY "employee_review_summary_insert"
            ON public.employee_review_summary
            FOR INSERT
            TO authenticated
            WITH CHECK (company_id = public.user_company_id());

        -- Create proper UPDATE policy
        CREATE POLICY "employee_review_summary_update"
            ON public.employee_review_summary
            FOR UPDATE
            TO authenticated
            USING (company_id = public.user_company_id())
            WITH CHECK (company_id = public.user_company_id());

        RAISE NOTICE 'Fixed employee_review_summary INSERT/UPDATE policies';
    END IF;

    -- Also check for employee_review_summaries (alternate table name)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'employee_review_summaries' AND column_name = 'company_id'
    ) THEN
        -- Drop overly permissive policies
        DROP POLICY IF EXISTS "insert_employee_review_summary" ON public.employee_review_summaries;
        DROP POLICY IF EXISTS "update_employee_review_summary" ON public.employee_review_summaries;

        -- Create proper INSERT policy
        CREATE POLICY "employee_review_summaries_insert"
            ON public.employee_review_summaries
            FOR INSERT
            TO authenticated
            WITH CHECK (company_id = public.user_company_id());

        -- Create proper UPDATE policy
        CREATE POLICY "employee_review_summaries_update"
            ON public.employee_review_summaries
            FOR UPDATE
            TO authenticated
            USING (company_id = public.user_company_id())
            WITH CHECK (company_id = public.user_company_id());

        RAISE NOTICE 'Fixed employee_review_summaries INSERT/UPDATE policies';
    END IF;
END $$;

-- ============================================
-- NOTES: Policies that are acceptable as USING(true)
-- ============================================
-- The following are OK because they are:
-- 1. SELECT-only for global read data (uom table, knowledge_base)
-- 2. service_role only (trusted internal operations)
-- 3. System notifications (INSERT only, creates not modifies)
--
-- - uom_global_read: SELECT on units of measure (global reference data)
-- - knowledge_base for service_role: Admin-only via service role
-- - planly_user_notifications INSERT: System creates notifications
-- - standard_departments SELECT: Global reference data

COMMENT ON FUNCTION public.user_company_id() IS
'Returns the authenticated user''s company_id with session caching.
Used by RLS policies to restrict access to user''s company data only.
This function caches the result in a session variable to prevent
repeated profile lookups. Created as part of DB performance optimization.';
