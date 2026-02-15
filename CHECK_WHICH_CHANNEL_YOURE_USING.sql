-- ============================================================================
-- Check which channels you're a member of and verify RLS would work
-- Replace 'bruce@e-a-g.co' with your email
-- ============================================================================

-- Show all your channel memberships
SELECT 
  'Your Channel Memberships' as info,
  mcm.channel_id,
  mc.name as channel_name,
  mc.channel_type,
  mcm.member_role,
  mcm.joined_at,
  mcm.left_at,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Active'
    ELSE '❌ Left'
  END as status
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'bruce@e-a-g.co'  -- Your email
ORDER BY mcm.joined_at DESC;

-- Show what the RLS policies would check
-- For typing_indicators: profile_id = auth.uid() AND channel_id matches membership
-- For messaging_messages: sender_profile_id = auth.uid() AND channel_id matches membership

SELECT 
  'RLS Check Explanation' as info,
  'When you send a message to channel_id X, RLS checks:' as check_1,
  '1. sender_profile_id = auth.uid() (your auth user ID)' as check_2,
  '2. EXISTS (SELECT 1 FROM messaging_channel_members WHERE channel_id = X AND profile_id = auth.uid() AND left_at IS NULL)' as check_3,
  '' as spacer,
  'Make sure the channel_id you''re sending to matches one of your memberships above!' as note;
