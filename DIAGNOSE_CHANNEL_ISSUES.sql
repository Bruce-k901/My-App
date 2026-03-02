-- ============================================================================
-- DIAGNOSE CHANNEL ISSUES
-- This script shows the current state of all channels and their members
-- ============================================================================

-- Show all channels with their members
SELECT 
  mc.id,
  mc.name as channel_name,
  mc.channel_type,
  mc.created_by,
  mc.created_at,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as active_member_count,
  STRING_AGG(
    p.full_name || ' (' || mcm.profile_id::text || ')', 
    ', '
  ) FILTER (WHERE mcm.left_at IS NULL) as member_names
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
LEFT JOIN public.profiles p ON p.id = mcm.profile_id
WHERE mc.archived_at IS NULL
GROUP BY mc.id, mc.name, mc.channel_type, mc.created_by, mc.created_at
ORDER BY mc.created_at DESC;

-- Show direct channels with member details
SELECT 
  mc.id,
  mc.name as channel_name,
  mc.created_by,
  p_creator.full_name as creator_name,
  p_creator.email as creator_email,
  mcm.profile_id,
  p_member.full_name as member_name,
  p_member.email as member_email,
  mcm.member_role,
  mcm.joined_at,
  mcm.left_at
FROM public.messaging_channels mc
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
LEFT JOIN public.profiles p_member ON p_member.id = mcm.profile_id
WHERE mc.channel_type = 'direct'
  AND mc.archived_at IS NULL
ORDER BY mc.created_at DESC, mcm.joined_at;

-- Count channels by type and member count
SELECT 
  mc.channel_type,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as member_count,
  COUNT(DISTINCT mc.id) as channel_count
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
WHERE mc.archived_at IS NULL
GROUP BY mc.channel_type, 
  (SELECT COUNT(*) FROM public.messaging_channel_members mcm2 
   WHERE mcm2.channel_id = mc.id AND mcm2.left_at IS NULL)
ORDER BY mc.channel_type, member_count;

-- Show channels that might be problematic
SELECT 
  mc.id,
  mc.name,
  mc.channel_type,
  mc.created_by,
  COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) as active_members,
  CASE 
    WHEN mc.channel_type = 'direct' AND COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) = 0 THEN 'NO MEMBERS'
    WHEN mc.channel_type = 'direct' AND COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) = 1 THEN 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.messaging_channel_members mcm2 
          WHERE mcm2.channel_id = mc.id 
            AND mcm2.profile_id = mc.created_by 
            AND mcm2.left_at IS NULL
        ) THEN 'SELF MESSAGE'
        ELSE 'MISSING MEMBERS'
      END
    WHEN mc.channel_type = 'direct' AND COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) < 2 THEN 'MISSING MEMBERS'
    ELSE 'OK'
  END as status
FROM public.messaging_channels mc
LEFT JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
WHERE mc.archived_at IS NULL
GROUP BY mc.id, mc.name, mc.channel_type, mc.created_by
HAVING 
  (mc.channel_type = 'direct' AND COUNT(mcm.profile_id) FILTER (WHERE mcm.left_at IS NULL) < 2)
ORDER BY mc.created_at DESC;
