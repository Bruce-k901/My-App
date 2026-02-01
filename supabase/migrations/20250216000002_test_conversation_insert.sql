-- ============================================================================
-- Migration: Test Conversation Insert Policy
-- Description: Temporary permissive policy to test conversation creation
-- Note: This migration will be skipped if conversations table doesn't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if conversations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    -- Drop all existing INSERT policies
    DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
    DROP POLICY IF EXISTS conversations_insert_debug ON public.conversations;

    -- Create a very simple policy that just checks authentication
    -- This will help us determine if the issue is with the policy logic or something else
    CREATE POLICY conversations_insert_company
      ON public.conversations
      FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by = auth.uid()
      );

    -- Verify it was created
    RAISE NOTICE '✅ Test policy created for conversations table';
  ELSE
    RAISE NOTICE '⚠️ conversations table does not exist yet - skipping policy update';
  END IF;
END $$;

