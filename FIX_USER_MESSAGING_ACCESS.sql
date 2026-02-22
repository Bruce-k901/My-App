-- ============================================================================
-- FIX: Ensure user has messaging access
-- Run this for a specific user who can't access messaging
-- Replace 'USER_EMAIL_HERE' with the actual user's email
-- ============================================================================

-- Step 1: Check if user has profile
DO $$
DECLARE
  user_email TEXT := 'USER_EMAIL_HERE';  -- Replace with actual email
  user_profile_id UUID;
  user_company_id UUID;
BEGIN
  -- Get user's profile
  SELECT id, company_id INTO user_profile_id, user_company_id
  FROM public.profiles
  WHERE email = user_email;
  
  IF user_profile_id IS NULL THEN
    RAISE NOTICE '⚠️ User % does not have a profile record', user_email;
    RAISE NOTICE 'User needs to complete onboarding first';
    RETURN;
  END IF;
  
  IF user_company_id IS NULL THEN
    RAISE NOTICE '⚠️ User % does not have a company_id', user_email;
    RAISE NOTICE 'User needs to be linked to a company';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ User found: profile_id=%, company_id=%', user_profile_id, user_company_id;
  
  -- Step 2: Ensure user is member of at least one channel in their company
  -- Get or create a default company-wide channel
  DECLARE
    default_channel_id UUID;
  BEGIN
    -- Check if company has a default channel
    SELECT id INTO default_channel_id
    FROM public.messaging_channels
    WHERE company_id = user_company_id
      AND channel_type = 'site'
      AND is_auto_created = true
    LIMIT 1;
    
    -- If no default channel, create one
    IF default_channel_id IS NULL THEN
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
        user_profile_id,
        true
      )
      RETURNING id INTO default_channel_id;
      
      RAISE NOTICE '✅ Created default channel: %', default_channel_id;
    ELSE
      RAISE NOTICE '✅ Found existing default channel: %', default_channel_id;
    END IF;
    
    -- Ensure user is a member
    INSERT INTO public.messaging_channel_members (
      channel_id,
      profile_id,
      member_role
    )
    VALUES (
      default_channel_id,
      user_profile_id,
      'member'
    )
    ON CONFLICT (channel_id, profile_id) DO UPDATE
    SET left_at = NULL;  -- Rejoin if they left
    
    RAISE NOTICE '✅ Added user to default channel';
  END;
END $$;

-- Verification
SELECT 
  'User messaging access fixed' as status,
  'Check channel memberships above' as next_step;
