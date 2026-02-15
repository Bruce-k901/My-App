-- Fix Orphaned Profiles
-- This script helps identify and fix profiles without company_id

-- Step 1: See the orphaned profiles
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.company_id,
    p.created_at,
    -- Check if user has auth record
    CASE WHEN au.id IS NOT NULL THEN 'Has auth record' ELSE 'No auth record' END as auth_status,
    -- Check if user created any companies
    (SELECT COUNT(*) FROM companies c WHERE c.created_by = p.id OR c.user_id = p.id) as companies_created
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.company_id IS NULL;

-- Step 2: Check if these users have companies they created
SELECT 
    p.id as profile_id,
    p.email,
    c.id as company_id,
    c.name as company_name,
    c.created_by,
    c.user_id
FROM profiles p
LEFT JOIN companies c ON (c.created_by = p.id OR c.user_id = p.id)
WHERE p.company_id IS NULL;

-- Step 3: FIX OPTION 1 - Link to company if they created one
-- Uncomment and run this if you want to link orphaned profiles to companies they created
/*
UPDATE profiles p
SET company_id = (
    SELECT c.id 
    FROM companies c 
    WHERE (c.created_by = p.id OR c.user_id = p.id)
    LIMIT 1
)
WHERE p.company_id IS NULL
AND EXISTS (
    SELECT 1 
    FROM companies c 
    WHERE (c.created_by = p.id OR c.user_id = p.id)
);
*/

-- Step 4: FIX OPTION 2 - Delete orphaned profiles (if they're test users)
-- Uncomment and run this ONLY if you're sure these are test users you don't need
/*
-- First, delete from auth.users (if they exist)
DELETE FROM auth.users 
WHERE id IN (
    SELECT id FROM profiles WHERE company_id IS NULL
);

-- Then delete the profiles
DELETE FROM profiles 
WHERE company_id IS NULL;
*/

-- Step 5: Verify fix
SELECT 
    COUNT(*) as orphaned_profiles_count
FROM profiles 
WHERE company_id IS NULL;
-- Should return 0 after fix


