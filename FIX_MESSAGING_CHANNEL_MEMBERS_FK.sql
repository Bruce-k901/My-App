-- ============================================================================
-- FIX: messaging_channel_members foreign key constraint
-- The constraint references auth.users but should reference profiles
-- OR we need to only add users who have auth accounts
-- ============================================================================

-- Step 1: Check what the constraint actually is
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'messaging_channel_members'
  AND (kcu.column_name = 'profile_id' OR kcu.column_name = 'user_id');

-- Step 2: Drop the old constraint if it references auth.users
DO $$
BEGIN
  -- Drop constraint if it references auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'messaging_channel_members'
      AND tc.constraint_name = 'messaging_channel_members_user_id_fkey'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  ) THEN
    ALTER TABLE public.messaging_channel_members
    DROP CONSTRAINT IF EXISTS messaging_channel_members_user_id_fkey;
    
    RAISE NOTICE '✅ Dropped old constraint that referenced auth.users';
  END IF;
  
  -- Create new constraint that references profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'messaging_channel_members'
      AND constraint_name = 'messaging_channel_members_profile_id_fkey'
  ) THEN
    ALTER TABLE public.messaging_channel_members
    ADD CONSTRAINT messaging_channel_members_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Created new constraint that references profiles';
  END IF;
END $$;

-- Verification
SELECT 
  'Constraint fixed' as status,
  'profile_id now references profiles(id) instead of auth.users(id)' as message;
