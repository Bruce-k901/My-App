-- ============================================================================
-- Fix current user's messaging access
-- Adds you to the default company channel if you're not already a member
-- ============================================================================

DO $$
DECLARE
  user_profile_id UUID;
  user_company_id UUID;
  default_channel_id UUID;
  auth_user_id UUID;
  constraint_refs_users BOOLEAN;
BEGIN
  -- Get current user's profile
  SELECT id, company_id INTO user_profile_id, user_company_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for current user. User ID: %', auth.uid();
  END IF;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User has no company_id. Cannot add to messaging channel.';
  END IF;
  
  RAISE NOTICE 'User: %, Company: %', user_profile_id, user_company_id;
  
  -- Check if user is already a member of any channel
  IF EXISTS (
    SELECT 1 FROM public.messaging_channel_members
    WHERE profile_id = user_profile_id
      AND left_at IS NULL
  ) THEN
    RAISE NOTICE '✅ User is already a member of at least one channel';
    RETURN;
  END IF;
  
  -- Find or create default channel
  SELECT id INTO default_channel_id
  FROM public.messaging_channels
  WHERE company_id = user_company_id
    AND channel_type = 'site'
    AND is_auto_created = true
  LIMIT 1;
  
  -- Create default channel if it doesn't exist
  IF default_channel_id IS NULL THEN
    -- Check what created_by constraint references
    SELECT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'messaging_channels'
        AND tc.constraint_name = 'messaging_channels_created_by_fkey'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) INTO constraint_refs_users;
    
    -- Get appropriate user ID for created_by
    IF constraint_refs_users THEN
      SELECT id INTO auth_user_id FROM auth.users WHERE id = user_profile_id LIMIT 1;
      IF auth_user_id IS NULL THEN
        SELECT au.id INTO auth_user_id
        FROM public.profiles p
        JOIN auth.users au ON au.id = p.id
        WHERE p.company_id = user_company_id AND p.app_role IN ('Admin', 'Owner')
        LIMIT 1;
      END IF;
    ELSE
      auth_user_id := user_profile_id;
    END IF;
    
    IF auth_user_id IS NULL THEN
      RAISE EXCEPTION 'Could not find valid user for created_by. Cannot create channel.';
    END IF;
    
    INSERT INTO public.messaging_channels (
      company_id,
      channel_type,
      name,
      description,
      created_by,
      is_auto_created
    )
    VALUES (
      user_company_id,
      'site',
      'General',
      'Company-wide messaging channel',
      auth_user_id,
      true
    )
    RETURNING id INTO default_channel_id;
    
    RAISE NOTICE '✅ Created default channel: %', default_channel_id;
  ELSE
    RAISE NOTICE '✅ Found existing default channel: %', default_channel_id;
  END IF;
  
  -- Add user to channel
  INSERT INTO public.messaging_channel_members (
    channel_id,
    profile_id,
    member_role
  )
  VALUES (
    default_channel_id,
    user_profile_id,
    CASE 
      WHEN (SELECT app_role FROM public.profiles WHERE id = user_profile_id) IN ('Admin', 'Owner') THEN 'admin'
      ELSE 'member'
    END
  )
  ON CONFLICT (channel_id, profile_id) DO UPDATE
  SET left_at = NULL;  -- Rejoin if they left
  
  RAISE NOTICE '✅ Added user to channel';
END $$;

-- Verification
SELECT 
  'Fix complete' as status,
  'You should now have messaging access' as message;
