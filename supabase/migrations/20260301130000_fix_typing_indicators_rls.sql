-- ============================================================================
-- Migration: Fix typing_indicators RLS policies
-- ============================================================================
-- The typing_indicators table columns were renamed:
--   conversation_id → channel_id
--   user_id → profile_id
-- But the RLS policies still referenced the old conversation_participants table.
-- This migration updates them to use messaging_channel_members and channel_id.
-- ============================================================================

-- Drop all old and partially-created policies (idempotent)
DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_manage_own ON public.typing_indicators;

-- Users can view typing indicators in channels they're a member of
CREATE POLICY typing_indicators_select_member
  ON public.typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = typing_indicators.channel_id
        AND mcm.profile_id = auth.uid()
        AND mcm.left_at IS NULL
    )
  );

-- Users can manage their own typing status in channels they belong to
CREATE POLICY typing_indicators_manage_own
  ON public.typing_indicators
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messaging_channel_members mcm
      WHERE mcm.channel_id = typing_indicators.channel_id
        AND mcm.profile_id = auth.uid()
        AND mcm.left_at IS NULL
    )
  );
