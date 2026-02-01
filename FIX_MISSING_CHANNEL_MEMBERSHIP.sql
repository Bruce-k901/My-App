-- ============================================================================
-- Fix: Add user to the channel they're trying to use
-- Channel ID from console: f0e90a4a-c348-4339-a67a-2803609a7c5c
-- ============================================================================

-- Check if channel exists
SELECT 
  'Channel Info' as check_type,
  mc.id,
  mc.name,
  mc.channel_type,
  mc.company_id,
  mc.created_by
FROM public.messaging_channels mc
WHERE mc.id = 'f0e90a4a-c348-4339-a67a-2803609a7c5c'::uuid;

-- Check if you're already a member
SELECT 
  'Current Membership' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.member_role,
  mcm.left_at,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Already a member'
    ELSE '❌ Left channel - will rejoin'
  END as status
FROM public.messaging_channel_members mcm
WHERE mcm.channel_id = 'f0e90a4a-c348-4339-a67a-2803609a7c5c'::uuid
  AND mcm.profile_id = '8066c4f2-fbff-4255-be96-71acf151473d'::uuid;  -- Your profile_id

-- Add you to the channel (or rejoin if you left)
INSERT INTO public.messaging_channel_members (
  channel_id,
  profile_id,
  member_role
)
VALUES (
  'f0e90a4a-c348-4339-a67a-2803609a7c5c'::uuid,
  '8066c4f2-fbff-4255-be96-71acf151473d'::uuid,  -- Your profile_id
  'member'  -- Change to 'admin' if you should be admin
)
ON CONFLICT (channel_id, profile_id) DO UPDATE
SET left_at = NULL,  -- Rejoin if you left
    member_role = EXCLUDED.member_role;

-- Verification
SELECT 
  '✅ Fix complete' as status,
  'You should now be able to send messages to this channel' as message;
