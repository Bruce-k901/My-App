-- ============================================================================
-- FIX messaging_channel_members INSERT POLICY
-- This adds the missing INSERT policy that allows users to add members to channels
-- ============================================================================

DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing INSERT policies if they exist (for idempotency)
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can add members to channels" ON public.messaging_channel_members;
  DROP POLICY IF EXISTS "Users can insert channel members" ON public.messaging_channel_members;
  
  -- Check which column exists (profile_id or user_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'profile_id'
  ) THEN
    -- Use profile_id (new column)
    -- Allow users to add members to channels in their company
    -- The member being added must also be in the same company
    CREATE POLICY messaging_channel_members_insert_member
      ON public.messaging_channel_members
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.messaging_channels mc
          WHERE mc.id = messaging_channel_members.channel_id
            AND mc.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = messaging_channel_members.profile_id
            AND p.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
      );
    
    RAISE NOTICE 'Created messaging_channel_members INSERT policy with profile_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_channel_members' 
    AND column_name = 'user_id'
  ) THEN
    -- Use user_id (old column - backward compatibility)
    CREATE POLICY messaging_channel_members_insert_member
      ON public.messaging_channel_members
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.messaging_channels mc
          WHERE mc.id = messaging_channel_members.channel_id
            AND mc.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = messaging_channel_members.user_id
            AND p.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
      );
    
    RAISE NOTICE 'Created messaging_channel_members INSERT policy with user_id';
  END IF;
END $$;
