-- Test: Can we find your profile?
-- Run this to see if the profile lookup works

SELECT 
  'auth.uid()' as check_type,
  auth.uid() as value;

SELECT 
  'Profile where id = auth.uid()' as check_type,
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.auth_user_id
FROM profiles p
WHERE p.id = auth.uid();

SELECT 
  'Profile where auth_user_id = auth.uid()' as check_type,
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.auth_user_id
FROM profiles p
WHERE p.auth_user_id = auth.uid();

SELECT 
  'Profile where id = auth.uid() OR auth_user_id = auth.uid()' as check_type,
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.auth_user_id,
  CASE 
    WHEN p.id = auth.uid() THEN '✅ id matches'
    WHEN p.auth_user_id = auth.uid() THEN '✅ auth_user_id matches'
    ELSE '❌ NO MATCH'
  END as match_status
FROM profiles p
WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid();

