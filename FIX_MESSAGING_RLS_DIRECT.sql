-- ============================================================================
-- DIRECT FIX FOR MESSAGING RLS - Assumes profile_id columns exist
-- Run this if you know your tables use profile_id (which they should based on frontend)
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix typing_indicators primary key/unique constraint
-- ============================================================================
-- Drop old constraints
ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_pkey CASCADE;
ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_channel_user_unique CASCADE;
ALTER TABLE public.typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_channel_profile_unique CASCADE;

-- Add primary key on (channel_id, profile_id)
ALTER TABLE public.typing_indicators
ADD PRIMARY KEY (channel_id, profile_id);

-- ============================================================================
-- STEP 2: Fix messaging_channel_members unique constraint for upsert
-- ============================================================================
-- Drop old constraint
ALTER TABLE public.messaging_channel_members DROP CONSTRAINT IF EXISTS messaging_channel_members_channel_profile_unique CASCADE;
ALTER TABLE public.messaging_channel_members DROP CONSTRAINT IF EXISTS messaging_channel_members_channel_user_unique CASCADE;

-- Add unique constraint for upsert
ALTER TABLE public.messaging_channel_members
ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
UNIQUE (channel_id, profile_id);

-- ============================================================================
-- STEP 3: Fix messaging_messages RLS INSERT policy
-- ============================================================================
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messaging_messages;

-- Create INSERT policy with sender_profile_id
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

-- ============================================================================
-- STEP 4: Fix typing_indicators RLS policies
-- ============================================================================
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_indicators_upsert_own" ON public.typing_indicators;

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

-- Create UPSERT policy
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

-- ============================================================================
-- STEP 5: Fix messaging_channel_members INSERT policy
-- ============================================================================
ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
DROP POLICY IF EXISTS "Users can add members to channels" ON public.messaging_channel_members;
DROP POLICY IF EXISTS "Users can insert channel members" ON public.messaging_channel_members;

-- Create INSERT policy
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Direct fix complete! All constraints and policies created.' as status;
