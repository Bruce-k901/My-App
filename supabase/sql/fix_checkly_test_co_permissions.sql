-- ============================================================================
-- Universal Permissions Fix for ALL Companies
-- Ensures proper RLS policies are in place for all companies
-- Fixes issues where non-admin users cannot:
-- 1. Clock in
-- 2. Start conversations
-- 3. See updated business page data
-- 4. See updated COSHH Data Sheets
--
-- IMPORTANT: This script works for ALL companies, not just one specific company.
-- All policies use company_id checks that work universally.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VERIFY USER PROFILES HAVE COMPANY_ID SET
-- ============================================================================

-- Check all users and their company assignments
SELECT 
  '=== USER COMPANY ASSIGNMENTS ===' as section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  c.name as company_name,
  CASE 
    WHEN p.company_id IS NULL THEN '❌ Missing company_id'
    WHEN p.company_id IS NOT NULL AND c.id IS NULL THEN '❌ Invalid company_id'
    ELSE '✅ OK'
  END as status
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
ORDER BY c.name NULLS LAST, p.app_role, p.email
LIMIT 100; -- Limit to first 100 for readability

-- ============================================================================
-- 2. FIX STAFF_ATTENDANCE INSERT POLICY
-- Ensure all users can clock in regardless of role
-- ============================================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS staff_attendance_insert_own ON public.staff_attendance;

-- Create INSERT policy that allows all authenticated users in the company to clock in
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

-- ============================================================================
-- 3. FIX CONVERSATIONS INSERT POLICY
-- Ensure all users can create conversations
-- ============================================================================

-- Check if conversations table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    -- Drop existing INSERT policy
    DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
    DROP POLICY IF EXISTS conversations_insert_authenticated ON public.conversations;
    DROP POLICY IF EXISTS conversations_insert_simple ON public.conversations;
    
    -- Create INSERT policy that allows all authenticated users in the company to create conversations
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
    
    RAISE NOTICE '✅ Conversations INSERT policy created';
  ELSE
    RAISE NOTICE '⚠️ Conversations table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 4. FIX COMPANIES SELECT POLICY
-- Ensure all users can view their company data
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_user_access ON public.companies;

-- Create SELECT policy that allows all users in the company to view company data
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

-- ============================================================================
-- 5. FIX CONVERSATION_PARTICIPANTS INSERT POLICY
-- Ensure users can be added as participants
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    -- Drop existing INSERT policy
    DROP POLICY IF EXISTS conversation_participants_insert_participant ON public.conversation_participants;
    DROP POLICY IF EXISTS conversation_participants_insert_company ON public.conversation_participants;
    
    -- Create INSERT policy that allows users to add themselves or be added to conversations in their company
    CREATE POLICY conversation_participants_insert_company
      ON public.conversation_participants FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.conversations c
          JOIN public.profiles p ON p.company_id = c.company_id
          WHERE c.id = conversation_participants.conversation_id
            AND p.id = auth.uid()
            AND p.company_id IS NOT NULL
        )
      );
    
    RAISE NOTICE '✅ Conversation participants INSERT policy created';
  ELSE
    RAISE NOTICE '⚠️ Conversation participants table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 6. FIX MESSAGES INSERT POLICY
-- Ensure users can send messages in conversations they're part of
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    -- Drop existing INSERT policy
    DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
    
      -- Create INSERT policy that allows users to send messages in conversations they're part of
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
    
    RAISE NOTICE '✅ Messages INSERT policy created';
  ELSE
    RAISE NOTICE '⚠️ Messages table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- Ensure authenticated users have necessary permissions
-- ============================================================================

-- Grant permissions on staff_attendance
GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;

-- Grant permissions on conversations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
    RAISE NOTICE '✅ Granted permissions on conversations';
  END IF;
END $$;

-- Grant permissions on conversation_participants (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
    RAISE NOTICE '✅ Granted permissions on conversation_participants';
  END IF;
END $$;

-- Grant permissions on messages (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
    RAISE NOTICE '✅ Granted permissions on messages';
  END IF;
END $$;

-- Grant permissions on companies
GRANT SELECT, UPDATE ON public.companies TO authenticated;

-- ============================================================================
-- 8. VERIFY POLICIES CREATED
-- ============================================================================

SELECT 
  '=== STAFF_ATTENDANCE POLICIES ===' as section,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'staff_attendance'
ORDER BY cmd, policyname;

SELECT 
  '=== CONVERSATIONS POLICIES ===' as section,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY cmd, policyname;

SELECT 
  '=== COMPANIES POLICIES ===' as section,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'companies'
ORDER BY cmd, policyname;

-- ============================================================================
-- 9. FIX COSHH DATA SHEETS PERMISSIONS
-- Ensure all users can view COSHH sheets (not just Admin)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coshh_data_sheets') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their company's COSHH sheets" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can upload COSHH sheets for their company" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can update their company's COSHH sheets" ON public.coshh_data_sheets;
    DROP POLICY IF EXISTS "Users can delete their company's COSHH sheets" ON public.coshh_data_sheets;
    
    -- Create SELECT policy - all users in company can view
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
    
    -- Create INSERT policy - all users in company can upload
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
    
    -- Create UPDATE policy - all users in company can update
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
    
    -- Create DELETE policy - all users in company can delete
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
    
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.coshh_data_sheets TO authenticated;
    
    RAISE NOTICE '✅ COSHH data sheets policies created';
  ELSE
    RAISE NOTICE '⚠️ COSHH data sheets table does not exist';
  END IF;
END $$;

-- ============================================================================
-- 10. CHECK FOR USERS WITH MISSING COMPANY_ID
-- ============================================================================

SELECT 
  '=== USERS WITH MISSING COMPANY_ID ===' as section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id
FROM public.profiles p
WHERE p.company_id IS NULL
ORDER BY p.email;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script fixes permissions for ALL companies (not just Checkly Test Co).
-- All policies use company_id checks that work universally.
--
-- What this fixes:
-- 1. ✅ Clock-in: All users in company can now clock in
-- 2. ✅ Conversations: All users in company can create conversations
-- 3. ✅ Messages: Users can send messages in conversations they're part of
-- 4. ✅ Companies: All users can view their company data
-- 5. ✅ COSHH Data Sheets: All users can view/update COSHH sheets (not just Admin)
-- 6. ✅ Permissions: Granted necessary table permissions
--
-- IMPORTANT NOTES:
-- - This script works for ALL companies, existing and future
-- - Role-based restrictions are enforced in application layer (src/lib/accessControl.ts)
-- - Database RLS ensures company-level data isolation
-- - Application layer enforces feature-level role restrictions
--
-- For a cleaner universal script without diagnostics, see:
-- supabase/sql/ensure_universal_rls_policies.sql
--
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify users have company_id set in their profiles
-- 3. Test clock-in functionality
-- 4. Test creating conversations
-- 5. Test viewing business page
-- 6. Verify role-based restrictions work in UI
-- ============================================================================

