# Fix Orphaned Profiles - Step by Step

## 🔍 What We Found

Two profiles without `company_id`:

1. `finalcheck@checkly.com` - Likely a test user
2. `bruce.kamp@outlook.com` - Your account (needs investigation)

## 📋 Step 1: Investigate These Profiles

Run this in Supabase SQL Editor to see more details:

```sql
-- See detailed info about orphaned profiles
SELECT
    p.id,
    p.email,
    p.full_name,
    p.company_id,
    p.created_at,
    -- Check if user has auth record
    CASE WHEN au.id IS NOT NULL THEN 'Has auth record' ELSE 'No auth record' END as auth_status,
    -- Check if user created any companies
    (SELECT COUNT(*) FROM companies c WHERE c.created_by = p.id OR c.user_id = p.id) as companies_created,
    -- Show companies they might have created
    (SELECT string_agg(c.name, ', ') FROM companies c WHERE c.created_by = p.id OR c.user_id = p.id) as company_names
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.company_id IS NULL;
```

This will show:

- If they have auth records
- If they created any companies
- What companies they created

---

## 🔧 Step 2: Fix Option 1 - Link to Company (If They Created One)

If the investigation shows they created companies, link them:

```sql
-- Link orphaned profiles to companies they created
UPDATE profiles p
SET company_id = (
    SELECT c.id
    FROM companies c
    WHERE (c.created_by = p.id OR c.user_id = p.id)
    ORDER BY c.created_at DESC
    LIMIT 1
)
WHERE p.company_id IS NULL
AND EXISTS (
    SELECT 1
    FROM companies c
    WHERE (c.created_by = p.id OR c.user_id = p.id)
);

-- Verify the fix
SELECT id, email, company_id
FROM profiles
WHERE company_id IS NULL;
-- Should return 0 rows now
```

---

## 🗑️ Step 3: Fix Option 2 - Delete Test Users (If They're Not Needed)

**⚠️ ONLY do this if you're sure these are test users you don't need!**

```sql
-- First, check what will be deleted
SELECT
    p.id,
    p.email,
    p.full_name,
    'Will delete profile and auth user' as action
FROM profiles p
WHERE p.company_id IS NULL
AND p.email LIKE '%test%' OR p.email LIKE '%checkly%';

-- If you're sure, delete them:
-- 1. Delete from auth.users (if they exist)
DELETE FROM auth.users
WHERE id IN (
    SELECT id FROM profiles WHERE company_id IS NULL
    AND (email LIKE '%test%' OR email LIKE '%checkly%')
);

-- 2. Delete the profiles
DELETE FROM profiles
WHERE company_id IS NULL
AND (email LIKE '%test%' OR email LIKE '%checkly%');

-- Verify deletion
SELECT COUNT(*) as remaining_orphaned
FROM profiles
WHERE company_id IS NULL;
```

---

## ✅ Step 4: Verify Fix

After fixing, run this to confirm:

```sql
-- Should return 0 rows
SELECT id, email, company_id
FROM profiles
WHERE company_id IS NULL;
```

---

## 🎯 Recommended Action

Based on the emails:

- `finalcheck@checkly.com` - Likely a test user, probably safe to delete
- `bruce.kamp@outlook.com` - Your account, probably needs a company linked

**My recommendation:**

1. First, run the investigation query (Step 1)
2. If `bruce.kamp@outlook.com` created a company, link it (Step 2)
3. If `finalcheck@checkly.com` is a test user, delete it (Step 3)

---

## 📝 After Fixing

Once fixed, run the database state checker again to confirm:

```sql
-- Check for orphaned profiles (should return 0)
SELECT COUNT(*) as orphaned_profiles
FROM profiles
WHERE company_id IS NULL;
```
