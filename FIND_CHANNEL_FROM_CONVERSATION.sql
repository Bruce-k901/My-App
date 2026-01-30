-- ============================================================================
-- Find channel information from a conversation/channel ID
-- Replace 'CHANNEL_ID_HERE' with the channel_id from the browser error
-- ============================================================================

-- Get channel info
SELECT 
  'Channel Info' as check_type,
  mc.id as channel_id,
  mc.name,
  mc.channel_type,
  mc.company_id,
  mc.created_by,
  mc.is_auto_created
FROM public.messaging_channels mc
WHERE mc.id = 'f0e90a4a-c348-4339-a67a-2803609a7c5c'::uuid;  -- Channel from console logs

-- Check if you're a member of this channel
SELECT 
  'Your Membership' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.member_role,
  mcm.left_at,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Active member'
    ELSE '❌ Left channel'
  END as status,
  CASE 
    WHEN mcm.profile_id = '8066c4f2-fbff-4255-be96-71acf151473d'::uuid  -- Your profile_id
      AND mcm.left_at IS NULL
    THEN '✅ You are a member - RLS should allow'
    ELSE '❌ You are NOT a member - RLS will block'
  END as rls_result
FROM public.messaging_channel_members mcm
WHERE mcm.channel_id = 'f0e90a4a-c348-4339-a67a-2803609a7c5c'::uuid  -- Channel from console logs
  AND mcm.profile_id = '8066c4f2-fbff-4255-be96-71acf151473d'::uuid;  -- Your profile_id
