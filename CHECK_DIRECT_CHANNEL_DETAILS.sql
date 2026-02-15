-- ============================================================================
-- CHECK DIRECT CHANNEL DETAILS
-- This shows exactly what each direct channel contains
-- ============================================================================

-- Show all direct channels with full participant details
SELECT 
  mc.id as channel_id,
  mc.name as channel_name,
  mc.created_by as creator_id,
  p_creator.full_name as creator_name,
  p_creator.email as creator_email,
  -- Member 1
  mcm1.profile_id as member1_id,
  p_member1.full_name as member1_name,
  p_member1.email as member1_email,
  mcm1.member_role as member1_role,
  mcm1.joined_at as member1_joined,
  -- Member 2
  mcm2.profile_id as member2_id,
  p_member2.full_name as member2_name,
  p_member2.email as member2_email,
  mcm2.member_role as member2_role,
  mcm2.joined_at as member2_joined,
  -- Status
  CASE 
    WHEN COUNT(DISTINCT mcm1.profile_id) FILTER (WHERE mcm1.left_at IS NULL) = 0 THEN 'NO MEMBERS'
    WHEN COUNT(DISTINCT mcm1.profile_id) FILTER (WHERE mcm1.left_at IS NULL) = 1 THEN 'ONE MEMBER'
    WHEN COUNT(DISTINCT mcm1.profile_id) FILTER (WHERE mcm1.left_at IS NULL) = 2 THEN 'OK'
    ELSE 'TOO MANY MEMBERS'
  END as status,
  mc.last_message_at,
  mc.created_at
FROM public.messaging_channels mc
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
LEFT JOIN public.messaging_channel_members mcm1 
  ON mcm1.channel_id = mc.id 
  AND mcm1.left_at IS NULL
LEFT JOIN public.profiles p_member1 ON p_member1.id = mcm1.profile_id
LEFT JOIN public.messaging_channel_members mcm2 
  ON mcm2.channel_id = mc.id 
  AND mcm2.profile_id != mcm1.profile_id
  AND mcm2.left_at IS NULL
LEFT JOIN public.profiles p_member2 ON p_member2.id = mcm2.profile_id
WHERE mc.channel_type = 'direct'
  AND mc.archived_at IS NULL
GROUP BY 
  mc.id, mc.name, mc.created_by, p_creator.full_name, p_creator.email,
  mcm1.profile_id, p_member1.full_name, p_member1.email, mcm1.member_role, mcm1.joined_at,
  mcm2.profile_id, p_member2.full_name, p_member2.email, mcm2.member_role, mcm2.joined_at,
  mc.last_message_at, mc.created_at
ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;

-- Simpler view: Just show each channel with all its members in separate rows
SELECT 
  mc.id as channel_id,
  mc.name as channel_name,
  mc.created_by as creator_id,
  p_creator.full_name as creator_name,
  mcm.profile_id as member_id,
  p_member.full_name as member_name,
  p_member.email as member_email,
  mcm.member_role,
  mcm.joined_at,
  CASE WHEN mcm.profile_id = mc.created_by THEN 'CREATOR' ELSE 'PARTICIPANT' END as member_type
FROM public.messaging_channels mc
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
INNER JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
LEFT JOIN public.profiles p_member ON p_member.id = mcm.profile_id
WHERE mc.channel_type = 'direct'
  AND mc.archived_at IS NULL
  AND mcm.left_at IS NULL
ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC, mcm.joined_at;
