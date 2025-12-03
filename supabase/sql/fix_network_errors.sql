-- ============================================================================
-- Fix Network Errors (406/400) - RLS and Query Issues
-- ============================================================================
-- This script fixes the root causes of 406/400 errors:
-- 1. Profiles 406 errors - Ensure RLS allows users to query their own profile
-- 2. Notifications 400 errors - Fix query syntax issues
-- 3. Push subscriptions - Create table if missing
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Profiles RLS Policy
-- ============================================================================
-- The profiles_select_own policy should allow users to query their own profile
-- If this is failing, the profile might not exist or auth.uid() is null

-- Check if profile exists for the user
-- Run this manually: SELECT * FROM profiles WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

-- Ensure the RLS policy exists and is correct
DO $$
BEGIN
    -- Drop and recreate to ensure it's correct
    DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
    
    CREATE POLICY profiles_select_own
      ON public.profiles
      FOR SELECT
      USING (id = auth.uid());
    
    RAISE NOTICE '✅ Profiles SELECT policy created/updated';
END $$;

-- ============================================================================
-- STEP 2: Verify Notifications RLS Policy
-- ============================================================================
-- The notifications policy requires a profile with company_id
-- If profile doesn't have company_id, notifications query will fail

DO $$
BEGIN
    -- Ensure notifications SELECT policy exists
    DROP POLICY IF EXISTS notifications_select_company ON public.notifications;
    
    CREATE POLICY notifications_select_company
      ON public.notifications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() 
          AND p.company_id = notifications.company_id
        )
      );
    
    RAISE NOTICE '✅ Notifications SELECT policy created/updated';
END $$;

-- ============================================================================
-- STEP 3: Create push_subscriptions table if missing
-- ============================================================================
-- This table might not exist, causing 406/409 errors

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
    DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
    DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
    
    -- Users can only see their own subscriptions
    CREATE POLICY push_subscriptions_select_own
      ON public.push_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
    
    -- Users can create their own subscriptions
    CREATE POLICY push_subscriptions_insert_own
      ON public.push_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own subscriptions
    CREATE POLICY push_subscriptions_update_own
      ON public.push_subscriptions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ push_subscriptions table and policies created/updated';
END $$;

-- ============================================================================
-- STEP 4: Verify Profile Exists for User
-- ============================================================================
-- Check if the user has a profile (run this manually with the user ID)
-- If profile doesn't exist, it needs to be created

-- Example check (replace with actual user ID):
-- SELECT 
--   u.id as user_id,
--   u.email,
--   p.id as profile_id,
--   p.company_id,
--   p.full_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE u.id = '232039a6-614f-4c66-97b5-447dd5968fb4';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After running this script:
-- 1. Profiles 406 errors should be resolved (if profile exists)
-- 2. Notifications 400 errors should be resolved (if profile has company_id)
-- 3. Push subscriptions 406/409 errors should be resolved (table now exists)
--
-- If errors persist:
-- - Check if profile exists: SELECT * FROM profiles WHERE id = auth.uid();
-- - Check if profile has company_id: SELECT company_id FROM profiles WHERE id = auth.uid();
-- - Check RLS policies: SELECT * FROM pg_policies WHERE tablename = 'profiles';


