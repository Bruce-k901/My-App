-- ============================================================================
-- MASTER SCRIPT: Fix All Messaging Issues
-- Run this script to fix everything in the correct order
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Constraints (Required for upsert to work)
-- ============================================================================

-- 1.1: Fix typing_indicators primary key
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.typing_indicators DROP CONSTRAINT typing_indicators_pkey CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.typing_indicators
    ADD PRIMARY KEY (channel_id, profile_id);
    RAISE NOTICE '✅ Added primary key on typing_indicators';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Primary key already exists';
  END;
END $$;

-- 1.2: Fix messaging_channel_members unique constraint
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.messaging_channel_members DROP CONSTRAINT messaging_channel_members_channel_profile_unique CASCADE;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TABLE public.messaging_channel_members
    ADD CONSTRAINT messaging_channel_members_channel_profile_unique 
    UNIQUE (channel_id, profile_id);
    RAISE NOTICE '✅ Added unique constraint on messaging_channel_members';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Unique constraint already exists';
  END;
END $$;

-- ============================================================================
-- PART 2: Fix RLS Policies
-- ============================================================================

-- 2.1: Fix messaging_messages INSERT policy
DO $$
BEGIN
  ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS messaging_messages_insert_member ON public.messaging_messages;
  DROP POLICY IF EXISTS "messaging_messages_insert_member" ON public.messaging_messages;
  DROP POLICY IF EXISTS "Members can post messages" ON public.messaging_messages;
  
  CREATE POLICY messaging_messages_insert_member
    ON public.messaging_messages
    FOR INSERT
    WITH CHECK (
      (sender_profile_id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = messaging_messages.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  RAISE NOTICE '✅ Created messaging_messages INSERT policy';
END $$;

-- 2.2: Fix typing_indicators RLS policies
DO $$
BEGIN
  ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS typing_indicators_select_member ON public.typing_indicators;
  DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;
  
  CREATE POLICY typing_indicators_select_member
    ON public.typing_indicators
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = typing_indicators.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  
  CREATE POLICY typing_indicators_upsert_own
    ON public.typing_indicators
    FOR ALL
    USING (profile_id = auth.uid())
    WITH CHECK (
      profile_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.messaging_channel_members mcm
        WHERE mcm.channel_id = typing_indicators.channel_id
          AND mcm.profile_id = auth.uid()
          AND (mcm.left_at IS NULL)
      )
    );
  RAISE NOTICE '✅ Created typing_indicators RLS policies';
END $$;

-- 2.3: Fix messaging_channel_members INSERT policy (allows self-add)
DO $$
BEGIN
  ALTER TABLE public.messaging_channel_members ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS messaging_channel_members_insert_member ON public.messaging_channel_members;
  
  CREATE POLICY messaging_channel_members_insert_member
    ON public.messaging_channel_members
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.messaging_channels mc
        WHERE mc.id = messaging_channel_members.channel_id
          AND mc.company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
          )
      )
      AND (
        -- Allow if adding yourself
        messaging_channel_members.profile_id = auth.uid()
        OR
        -- Allow if adding someone else in the same company
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = messaging_channel_members.profile_id
            AND p.company_id IN (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
        )
      )
    );
  RAISE NOTICE '✅ Created messaging_channel_members INSERT policy (allows self-add)';
END $$;

-- ============================================================================
-- PART 3: Create Auto-Add Trigger for New Users
-- ============================================================================

-- 3.1: Create function to add user to default channel
CREATE OR REPLACE FUNCTION public.add_user_to_default_messaging_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_channel_id UUID;
BEGIN
  -- Only proceed if user has a company_id
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find or create default company-wide channel
  SELECT id INTO default_channel_id
  FROM public.messaging_channels
  WHERE company_id = NEW.company_id
    AND channel_type = 'site'
    AND is_auto_created = true
  LIMIT 1;
  
  -- If no default channel exists, create one
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
      NEW.company_id,
      'site',
      'General',
      'Company-wide messaging channel',
      -- Check constraint and use appropriate ID
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = 'messaging_channels'
            AND tc.constraint_name = 'messaging_channels_created_by_fkey'
            AND ccu.table_schema = 'auth'
            AND ccu.table_name = 'users'
        ) THEN COALESCE(
          (SELECT id FROM auth.users WHERE id = NEW.id LIMIT 1),
          (SELECT au.id FROM public.profiles p JOIN auth.users au ON au.id = p.id 
           WHERE p.company_id = NEW.company_id AND p.app_role IN ('Admin', 'Owner') LIMIT 1)
        )
        ELSE NEW.id  -- Constraint references profiles
      END,
      true
    )
    RETURNING id INTO default_channel_id;
  END IF;
  
  -- Add user as member (reactivate if previously left)
  INSERT INTO public.messaging_channel_members (
    channel_id,
    profile_id,
    member_role
  )
  VALUES (
    default_channel_id,
    NEW.id,
    CASE
      WHEN NEW.app_role IN ('Admin', 'Owner') THEN 'admin'
      ELSE 'member'
    END
  )
  ON CONFLICT (channel_id, profile_id) DO UPDATE SET left_at = NULL;
  
  RETURN NEW;
END;
$$;

-- 3.2: Create trigger
DROP TRIGGER IF EXISTS on_profile_company_set ON public.profiles;
CREATE TRIGGER on_profile_company_set
  AFTER INSERT OR UPDATE OF company_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.company_id IS NOT NULL)
  EXECUTE FUNCTION public.add_user_to_default_messaging_channel();

GRANT EXECUTE ON FUNCTION public.add_user_to_default_messaging_channel() TO authenticated;

RAISE NOTICE '✅ Created trigger to auto-add users to messaging channels';

-- ============================================================================
-- PART 4: Fix Existing Users (Grant Messaging Access Retroactively)
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  default_channel_id UUID;
  members_added INT := 0;
BEGIN
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
    -- Find or create default channel
    SELECT id INTO default_channel_id
    FROM public.messaging_channels
    WHERE company_id = user_record.company_id
      AND channel_type = 'site'
      AND is_auto_created = true
    LIMIT 1;
    
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
        
        -- If constraint references auth.users, find matching auth user
        IF constraint_refs_users THEN
          SELECT id INTO auth_user_id
          FROM auth.users
          WHERE id = user_record.profile_id
          LIMIT 1;
          
          -- If no auth user, find any admin in the company
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
        
        -- Only create if we have a valid user
        IF auth_user_id IS NOT NULL THEN
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
        END IF;
      END;
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
    SET left_at = NULL;
    
    members_added := members_added + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Added % existing users to messaging channels', members_added;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  '✅ All fixes complete!' as status,
  'Constraints, RLS policies, trigger, and existing users have been fixed.' as message;

-- Show summary
SELECT 
  'Users with messaging access' as metric,
  COUNT(DISTINCT p.id) as count
FROM public.profiles p
WHERE p.company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.messaging_channel_members mcm
    WHERE mcm.profile_id = p.id
      AND mcm.left_at IS NULL
  );
