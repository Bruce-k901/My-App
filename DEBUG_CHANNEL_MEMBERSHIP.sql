-- Debug script to check if user is a member of channels
-- This will help identify why RLS is blocking

-- Check current user
SELECT 
  'Current user' as check_type,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email;

-- Check user's profile
SELECT 
  'User profile' as check_type,
  id,
  email,
  full_name,
  company_id
FROM public.profiles
WHERE id = auth.uid();

-- Check all channels user is a member of
SELECT 
  'Channel memberships' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.member_role,
  mcm.left_at,
  mc.name as channel_name,
  mc.company_id as channel_company_id
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
WHERE mcm.profile_id = auth.uid()
ORDER BY mcm.joined_at DESC
LIMIT 10;

-- Check recent messages to see what channel_id is being used
SELECT 
  'Recent messages' as check_type,
  id,
  channel_id,
  sender_profile_id,
  content,
  created_at
FROM public.messaging_messages
WHERE sender_profile_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Check if user can see typing indicators
SELECT 
  'Typing indicators visible' as check_type,
  ti.channel_id,
  ti.profile_id,
  ti.is_typing,
  mc.name as channel_name
FROM public.typing_indicators ti
JOIN public.messaging_channels mc ON mc.id = ti.channel_id
WHERE EXISTS (
  SELECT 1 FROM public.messaging_channel_members mcm
  WHERE mcm.channel_id = ti.channel_id
    AND mcm.profile_id = auth.uid()
    AND mcm.left_at IS NULL
)
LIMIT 5;
