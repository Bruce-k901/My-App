-- ============================================================================
-- Universal RLS Policies for ALL Companies
-- This script ensures proper Row Level Security policies are in place
-- for all companies, ensuring role-based access control works correctly.
--
-- This should be run:
-- 1. Once to fix existing companies
-- 2. As part of database migrations for new companies
-- 3. When adding new tables that need RLS
--
-- All policies use company_id checks that work universally for any company.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. STAFF ATTENDANCE (Clock-in/out)
-- All users in a company can clock in/out, regardless of role
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS staff_attendance_insert_own ON public.staff_attendance;
DROP POLICY IF EXISTS staff_attendance_select_own ON public.staff_attendance;
DROP POLICY IF EXISTS staff_attendance_select_company ON public.staff_attendance;
DROP POLICY IF EXISTS staff_attendance_update_own ON public.staff_attendance;
DROP POLICY IF EXISTS staff_attendance_update_company ON public.staff_attendance;

-- INSERT: All users can clock in for themselves
CREATE POLICY staff_attendance_insert_own
  ON public.staff_attendance FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = staff_attendance.company_id
        AND p.company_id IS NOT NULL
    )
  );

-- SELECT: Users can view their own attendance, managers/admins can view company attendance
CREATE POLICY staff_attendance_select_own
  ON public.staff_attendance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY staff_attendance_select_company
  ON public.staff_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = staff_attendance.company_id
        AND LOWER(p.app_role) IN ('manager', 'admin', 'owner')
    )
  );

-- UPDATE: Users can update their own attendance, managers/admins can update company attendance
CREATE POLICY staff_attendance_update_own
  ON public.staff_attendance FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY staff_attendance_update_company
  ON public.staff_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = staff_attendance.company_id
        AND LOWER(p.app_role) IN ('manager', 'admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = staff_attendance.company_id
        AND LOWER(p.app_role) IN ('manager', 'admin', 'owner')
    )
  );

-- ============================================================================
-- 2. CONVERSATIONS (Messaging)
-- All users in a company can create conversations
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
    DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;
    DROP POLICY IF EXISTS conversations_update_creator_or_admin ON public.conversations;
    
    -- INSERT: All users in company can create conversations
    CREATE POLICY conversations_insert_company
      ON public.conversations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = conversations.company_id
            AND p.company_id IS NOT NULL
        )
      );
    
    -- SELECT: Users can view conversations they're part of
    CREATE POLICY conversations_select_participant
      ON public.conversations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = conversations.id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
    
    -- UPDATE: Only creator or admins can update
    CREATE POLICY conversations_update_creator_or_admin
      ON public.conversations FOR UPDATE
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = conversations.company_id
            AND LOWER(p.app_role) IN ('admin', 'owner')
        )
      );
    
    RAISE NOTICE '✅ Conversations policies created';
  END IF;
END $$;

-- ============================================================================
-- 3. MESSAGES
-- Users can send messages in conversations they're part of
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
    DROP POLICY IF EXISTS messages_select_participant ON public.messages;
    
    -- INSERT: Users can send messages in conversations they're part of
    CREATE POLICY messages_insert_participant
      ON public.messages FOR INSERT
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
    
    -- SELECT: Users can view messages in conversations they're part of
    CREATE POLICY messages_select_participant
      ON public.messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
      );
    
    RAISE NOTICE '✅ Messages policies created';
  END IF;
END $$;

-- ============================================================================
-- 4. COMPANIES (Business Details)
-- All users in a company can view company data
-- Only admins/owners can update (enforced by application logic)
-- ============================================================================

ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_user_access ON public.companies;
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;

-- SELECT: All users in company can view company data
CREATE POLICY companies_select_own_or_profile
  ON public.companies FOR SELECT
  USING (
    companies.user_id = auth.uid()
    OR companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
        AND p.company_id IS NOT NULL
    )
  );

-- INSERT: Users can create companies (during signup)
CREATE POLICY companies_insert_own
  ON public.companies FOR INSERT
  WITH CHECK (
    companies.user_id = auth.uid()
    OR companies.created_by = auth.uid()
  );

-- UPDATE: Users can update companies they're linked to (role check in application)
CREATE POLICY companies_update_own_or_profile
  ON public.companies FOR UPDATE
  USING (
    companies.user_id = auth.uid()
    OR companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
        AND p.company_id IS NOT NULL
    )
  )
  WITH CHECK (
    companies.user_id = auth.uid()
    OR companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
        AND p.company_id IS NOT NULL
    )
  );

-- ============================================================================
-- 5. COSHH DATA SHEETS
-- All users in company can view/upload/update COSHH sheets
-- Role-based restrictions handled in application layer
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coshh_data_sheets') THEN
    ALTER TABLE public.coshh_data_sheets ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company's COSHH sheets" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can upload COSHH sheets for their company" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can update their company's COSHH sheets" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can delete their company's COSHH sheets" ON public.coshh_data_sheets;
    
    -- SELECT: All users in company can view
    CREATE POLICY "Users can view their company's COSHH sheets"
      ON public.coshh_data_sheets FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = coshh_data_sheets.company_id
            AND p.company_id IS NOT NULL
        )
      );
    
    -- INSERT: All users in company can upload
    CREATE POLICY "Users can upload COSHH sheets for their company"
      ON public.coshh_data_sheets FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = coshh_data_sheets.company_id
            AND p.company_id IS NOT NULL
        )
      );
    
    -- UPDATE: All users in company can update
    CREATE POLICY "Users can update their company's COSHH sheets"
      ON public.coshh_data_sheets FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = coshh_data_sheets.company_id
            AND p.company_id IS NOT NULL
        )
      );
    
    -- DELETE: All users in company can delete
    CREATE POLICY "Users can delete their company's COSHH sheets"
      ON public.coshh_data_sheets FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = coshh_data_sheets.company_id
            AND p.company_id IS NOT NULL
        )
      );
    
    RAISE NOTICE '✅ COSHH data sheets policies created';
  END IF;
END $$;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- Ensure authenticated users have necessary table permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;
GRANT SELECT, UPDATE ON public.companies TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coshh_data_sheets') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.coshh_data_sheets TO authenticated;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script ensures proper RLS policies for ALL companies:
--
-- ✅ Clock-in: All users can clock in (role check in application for viewing others)
-- ✅ Conversations: All users can create conversations in their company
-- ✅ Messages: Users can send messages in conversations they're part of
-- ✅ Companies: All users can view their company data
-- ✅ COSHH Sheets: All users can view/upload/update sheets in their company
--
-- ROLE-BASED RESTRICTIONS:
-- - RLS policies ensure company-level isolation
-- - Application layer enforces role-based restrictions (see src/lib/accessControl.ts)
-- - Staff role restrictions: Organization, Business Details, Sites, Users, etc.
-- - Manager/Admin/Owner: Full access to all features
--
-- This script works universally for:
-- - Existing companies
-- - New companies created in the future
-- - Any number of companies
--
-- Next steps:
-- 1. Run this script once to fix all existing companies
-- 2. Include in database migrations for new deployments
-- 3. Verify role-based restrictions work in application layer
-- ============================================================================
