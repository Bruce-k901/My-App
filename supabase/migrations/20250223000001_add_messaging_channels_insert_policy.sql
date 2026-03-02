-- Migration: Add INSERT policy for messaging_channels table
-- This allows users to create conversations/channels in their company
-- Note: This migration will be skipped if messaging_channels table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if messaging_channels table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messaging_channels') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

    -- Drop existing INSERT policy if it exists (for idempotency)
    DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
    DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
    DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;

    -- Create INSERT policy that allows users to create channels in their company
    -- Uses the check_user_company_match function from the messaging system migration
    CREATE POLICY "Users can create channels in their company" ON messaging_channels
    FOR INSERT
    WITH CHECK (
      created_by = auth.uid()
      AND (
        -- Check if function exists and use it, otherwise use fallback check
        (
          (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'check_user_company_match'))
          AND public.check_user_company_match(auth.uid(), company_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = messaging_channels.company_id
        )
      )
    );

    -- Add comment
    COMMENT ON POLICY "Users can create channels in their company" ON messaging_channels IS 
    'Allows authenticated users to create messaging channels/conversations in their own company';

    -- Reload schema
    NOTIFY pgrst, 'reload schema';

    RAISE NOTICE 'Added INSERT policy for messaging_channels';

  ELSE
    RAISE NOTICE '⚠️ messaging_channels table does not exist yet - skipping INSERT policy';
  END IF;
END $$;

