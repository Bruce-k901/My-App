-- ============================================================================
-- Force create RLS policies - drops and recreates them
-- ============================================================================

-- ============================================================================
-- messaging_messages policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (force cleanup)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'messaging_messages'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.messaging_messages';
  END LOOP;
END $$;

-- Create INSERT policy
CREATE POLICY messaging_messages_insert_member
  ON public.messaging_messages
  FOR INSERT
  WITH CHECK (
    (sender_profile_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = messaging_messages.channel_id
        AND mcm.profile_id = auth.uid()
        AND (mcm.left_at IS NULL)
    )
  );

-- Create SELECT policy
CREATE POLICY messaging_messages_select_member
  ON public.messaging_messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = messaging_messages.channel_id
        AND mcm.profile_id = auth.uid()
        AND (mcm.left_at IS NULL)
    )
  );

-- Create UPDATE policy (for editing messages)
CREATE POLICY messaging_messages_update_sender
  ON public.messaging_messages
  FOR UPDATE
  USING (sender_profile_id = auth.uid())
  WITH CHECK (sender_profile_id = auth.uid());

-- ============================================================================
-- typing_indicators policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (force cleanup)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'typing_indicators'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.typing_indicators';
  END LOOP;
END $$;

-- Create SELECT policy
CREATE POLICY typing_indicators_select_member
  ON public.typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = typing_indicators.channel_id
        AND mcm.profile_id = auth.uid()
        AND (mcm.left_at IS NULL)
    )
  );

-- Create ALL policy (INSERT/UPDATE/DELETE) for own typing indicators
CREATE POLICY typing_indicators_upsert_own
  ON public.typing_indicators
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = typing_indicators.channel_id
        AND mcm.profile_id = auth.uid()
        AND (mcm.left_at IS NULL)
    )
  );

-- Verification
SELECT 
  '✅ Policies created' as status,
  COUNT(*) FILTER (WHERE tablename = 'messaging_messages') as messaging_messages_policies,
  COUNT(*) FILTER (WHERE tablename = 'typing_indicators') as typing_indicators_policies
FROM pg_policies
WHERE tablename IN ('messaging_messages', 'typing_indicators');
