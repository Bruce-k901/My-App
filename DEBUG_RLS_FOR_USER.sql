-- ============================================================================
-- Debug RLS policies for a specific user
-- Replace 'bruce@e-a-g.co' with the email you want to check
-- ============================================================================

DO $$
DECLARE
  user_email TEXT := 'bruce@e-a-g.co';  -- Your email
  user_profile_id UUID;
  user_company_id UUID;
  test_channel_id UUID;
BEGIN
  -- Get user info
  SELECT id, company_id INTO user_profile_id, user_company_id
  FROM public.profiles
  WHERE email = user_email;
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RAISE NOTICE 'User: % (%), Company: %', user_email, user_profile_id, user_company_id;
  
  -- Show all channel memberships
  RAISE NOTICE '=== Channel Memberships ===';
  FOR test_channel_id IN
    SELECT channel_id FROM public.messaging_channel_members
    WHERE profile_id = user_profile_id
      AND left_at IS NULL
  LOOP
    RAISE NOTICE 'Channel: %', test_channel_id;
    
    -- Check if RLS would allow SELECT on typing_indicators
    RAISE NOTICE '  - Typing indicators SELECT: Would check if profile_id = % AND channel_id = %', user_profile_id, test_channel_id;
    
    -- Check if RLS would allow INSERT on messaging_messages
    RAISE NOTICE '  - Messages INSERT: Would check if sender_profile_id = % AND channel_id = %', user_profile_id, test_channel_id;
  END LOOP;
  
  -- Show what the RLS policies actually check
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS Policy Checks ===';
  RAISE NOTICE 'typing_indicators_upsert_own checks:';
  RAISE NOTICE '  USING: profile_id = auth.uid()';
  RAISE NOTICE '  WITH CHECK: profile_id = auth.uid() AND EXISTS (SELECT 1 FROM messaging_channel_members WHERE channel_id = typing_indicators.channel_id AND profile_id = auth.uid() AND left_at IS NULL)';
  RAISE NOTICE '';
  RAISE NOTICE 'messaging_messages_insert_member checks:';
  RAISE NOTICE '  WITH CHECK: sender_profile_id = auth.uid() AND EXISTS (SELECT 1 FROM messaging_channel_members WHERE channel_id = messaging_messages.channel_id AND profile_id = auth.uid() AND left_at IS NULL)';
  
END $$;

-- Show actual memberships
SELECT 
  'Your Memberships' as info,
  mcm.channel_id,
  mc.name as channel_name,
  mcm.member_role,
  mcm.joined_at,
  mcm.left_at
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'bruce@e-a-g.co'  -- Your email
  AND mcm.left_at IS NULL
ORDER BY mcm.joined_at DESC;
