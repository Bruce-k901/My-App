-- ============================================================================
-- CHECK WHAT A SPECIFIC USER SEES
-- Replace 'USER_EMAIL_HERE' with the actual user email to check
-- ============================================================================

-- First, get the user's profile ID
SELECT 
  id as profile_id,
  full_name,
  email,
  company_id
FROM public.profiles
WHERE email = 'USER_EMAIL_HERE'; -- Replace with actual email

-- Then, see what channels they're a member of
SELECT 
  mc.id as channel_id,
  mc.name as channel_name,
  mc.channel_type,
  mc.created_by,
  p_creator.full_name as creator_name,
  p_creator.email as creator_email,
  mcm.profile_id as member_profile_id,
  p_member.full_name as member_name,
  p_member.email as member_email,
  mcm.member_role,
  mcm.joined_at,
  mcm.left_at
FROM public.messaging_channels mc
INNER JOIN public.messaging_channel_members mcm ON mcm.channel_id = mc.id
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
LEFT JOIN public.profiles p_member ON p_member.id = mcm.profile_id
WHERE mc.archived_at IS NULL
  AND mcm.profile_id = (SELECT id FROM public.profiles WHERE email = 'USER_EMAIL_HERE') -- Replace with actual email
  AND mcm.left_at IS NULL
ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;

-- For each direct channel, show who the OTHER participant is
SELECT 
  mc.id as channel_id,
  mc.name as channel_name,
  mc.created_by,
  p_creator.full_name as creator_name,
  p_creator.email as creator_email,
  -- Current user (the one we're checking)
  mcm_current.profile_id as current_user_id,
  p_current.full_name as current_user_name,
  -- Other participant
  mcm_other.profile_id as other_user_id,
  p_other.full_name as other_user_name,
  p_other.email as other_user_email,
  CASE 
    WHEN p_other.id IS NULL THEN 'MISSING OTHER PARTICIPANT'
    WHEN mcm_current.profile_id = mcm_other.profile_id THEN 'SELF MESSAGE'
    ELSE 'OK'
  END as status
FROM public.messaging_channels mc
INNER JOIN public.messaging_channel_members mcm_current 
  ON mcm_current.channel_id = mc.id 
  AND mcm_current.profile_id = (SELECT id FROM public.profiles WHERE email = 'USER_EMAIL_HERE') -- Replace
  AND mcm_current.left_at IS NULL
LEFT JOIN public.profiles p_current ON p_current.id = mcm_current.profile_id
LEFT JOIN public.profiles p_creator ON p_creator.id = mc.created_by
LEFT JOIN public.messaging_channel_members mcm_other 
  ON mcm_other.channel_id = mc.id 
  AND mcm_other.profile_id != mcm_current.profile_id
  AND mcm_other.left_at IS NULL
LEFT JOIN public.profiles p_other ON p_other.id = mcm_other.profile_id
WHERE mc.channel_type = 'direct'
  AND mc.archived_at IS NULL
ORDER BY mc.last_message_at DESC NULLS LAST, mc.created_at DESC;
