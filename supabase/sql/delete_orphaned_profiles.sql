-- Delete Orphaned Profiles
-- This script safely deletes profiles without company_id
-- 
-- IMPORTANT: This will delete:
-- 1. Auth users (if they exist)
-- 2. Profiles
--
-- Run this in Supabase SQL Editor

-- Step 1: Preview what will be deleted
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    'Will be deleted' as action
FROM profiles p
WHERE p.company_id IS NULL;

-- Step 2: Delete auth users first (if they exist)
-- This uses the admin function to delete auth users
DO $$ 
DECLARE
    profile_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    FOR profile_record IN 
        SELECT id, email FROM profiles WHERE company_id IS NULL
    LOOP
        -- Delete from auth.users if exists
        BEGIN
            DELETE FROM auth.users WHERE id = profile_record.id;
            IF FOUND THEN
                deleted_count := deleted_count + 1;
                RAISE NOTICE 'Deleted auth user: % (%)', profile_record.email, profile_record.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not delete auth user %: %', profile_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Deleted % auth user(s)', deleted_count;
END $$;

-- Step 3: Delete the orphaned profiles
DELETE FROM profiles 
WHERE company_id IS NULL;

-- Step 4: Verify deletion
SELECT 
    COUNT(*) as remaining_orphaned_profiles
FROM profiles 
WHERE company_id IS NULL;
-- Should return 0

-- Step 5: Show confirmation
SELECT 
    'Deletion complete' as status,
    'All orphaned profiles have been removed' as message;


