-- ============================================================================
-- FIX: Add all existing users to default messaging channels
-- This grants messaging access to users who were created before messaging was set up
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  default_channel_id UUID;
  members_added INT := 0;
BEGIN
  -- Loop through all profiles with company_id but no channel memberships
  FOR user_record IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      p.app_role,
      p.email
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.profile_id = p.id
          AND mcm.left_at IS NULL
      )
  LOOP
    -- Find or create default channel for this company
    SELECT id INTO default_channel_id
    FROM public.messaging_channels
    WHERE company_id = user_record.company_id
      AND channel_type = 'site'
      AND is_auto_created = true
    LIMIT 1;
    
    -- Create default channel if it doesn't exist
    IF default_channel_id IS NULL THEN
      DECLARE
        auth_user_id UUID;
        constraint_refs_users BOOLEAN;
      BEGIN
        -- Check what the constraint actually references
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'messaging_channels'
            AND tc.constraint_name = 'messaging_channels_created_by_fkey'
            AND ccu.table_schema = 'auth'
            AND ccu.table_name = 'users'
        ) INTO constraint_refs_users;
        
        -- Try to find matching auth.users.id (if constraint references auth.users)
        IF constraint_refs_users THEN
          SELECT id INTO auth_user_id
          FROM auth.users
          WHERE id = user_record.profile_id
          LIMIT 1;
          
          -- If no auth user found, try to find any admin user in the company
          IF auth_user_id IS NULL THEN
            SELECT au.id INTO auth_user_id
            FROM public.profiles p
            JOIN auth.users au ON au.id = p.id
            WHERE p.company_id = user_record.company_id
              AND p.app_role IN ('Admin', 'Owner')
            LIMIT 1;
          END IF;
        ELSE
          -- Constraint references profiles, use profile_id directly
          auth_user_id := user_record.profile_id;
        END IF;
        
        -- If still no valid user, skip channel creation
        IF auth_user_id IS NULL THEN
          RAISE NOTICE '⚠️ No valid user found for profile %, skipping channel creation', user_record.profile_id;
          CONTINUE;  -- Skip this user
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
          user_record.company_id,
          'site',
          'General',
          'Company-wide messaging channel',
          auth_user_id,
          true
        )
        RETURNING id INTO default_channel_id;
        
        RAISE NOTICE 'Created default channel % for company % (created_by: %)', default_channel_id, user_record.company_id, auth_user_id;
      END;
    END IF;
    
    -- Add user to channel (only if they have an auth account OR constraint allows profiles)
    -- Check if constraint references auth.users or profiles
    DECLARE
      constraint_refs_users BOOLEAN;
      has_auth_account BOOLEAN;
    BEGIN
      -- Check what the constraint references
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'messaging_channel_members'
          AND (tc.constraint_name LIKE '%profile_id%' OR tc.constraint_name LIKE '%user_id%')
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
      ) INTO constraint_refs_users;
      
      -- If constraint references auth.users, check if user has auth account
      IF constraint_refs_users THEN
        SELECT EXISTS (
          SELECT 1 FROM auth.users WHERE id = user_record.profile_id
        ) INTO has_auth_account;
        
        IF NOT has_auth_account THEN
          RAISE NOTICE '⚠️ User % (%) has no auth account, skipping channel membership', user_record.email, user_record.profile_id;
          CONTINUE;  -- Skip this user
        END IF;
      END IF;
      
      -- Add user to channel
      INSERT INTO public.messaging_channel_members (
        channel_id,
        profile_id,
        member_role
      )
      VALUES (
        default_channel_id,
        user_record.profile_id,
        CASE 
          WHEN user_record.app_role IN ('Admin', 'Owner') THEN 'admin'
          ELSE 'member'
        END
      )
      ON CONFLICT (channel_id, profile_id) DO UPDATE
      SET left_at = NULL;  -- Rejoin if they left
    END;
    
    members_added := members_added + 1;
    
    RAISE NOTICE 'Added user % (%) to channel %', user_record.email, user_record.profile_id, default_channel_id;
  END LOOP;
  
  RAISE NOTICE '✅ Added % users to messaging channels', members_added;
END $$;

-- Verification
SELECT 
  'Fix complete' as status,
  COUNT(*) as users_with_messaging_access
FROM public.profiles p
WHERE p.company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.messaging_channel_members mcm
    WHERE mcm.profile_id = p.id
      AND mcm.left_at IS NULL
  );
