# Checkly Test Co Permissions Fix

## Issue

Users in "Checkly Test Co" company are unable to:

1. ❌ Clock in
2. ❌ Start conversations in messaging module
3. ❌ See updated data on business page
4. ❌ See updated COSHH Data Sheets (only Admin can see)

## Root Cause

RLS (Row Level Security) policies were too restrictive or missing, preventing non-admin users from:

- Inserting into `staff_attendance` table (clock-in)
- Inserting into `conversations` table (starting conversations)
- Viewing `companies` table (business page data)
- Accessing other company data

## Solution

Created comprehensive SQL fix script: `supabase/sql/fix_checkly_test_co_permissions.sql`

### What the Script Does:

1. **Verifies User Profiles**
   - Checks if users have `company_id` set correctly
   - Identifies users with missing or invalid `company_id`

2. **Fixes Clock-In Permissions**
   - Updates `staff_attendance_insert_own` policy
   - Allows all authenticated users in the company to clock in
   - No role restrictions for clock-in

3. **Fixes Conversation Permissions**
   - Creates/updates `conversations_insert_company` policy
   - Allows all users in the company to create conversations
   - Ensures users can add participants

4. **Fixes Message Permissions**
   - Creates/updates `messages_insert_participant` policy
   - Allows users to send messages in conversations they're part of

5. **Fixes Company Data Access**
   - Updates `companies_select_own_or_profile` policy
   - Ensures all users can view their company data

6. **Grants Table Permissions**
   - Grants SELECT, INSERT, UPDATE on relevant tables
   - Ensures authenticated users have necessary permissions

## How to Apply the Fix

### Step 1: Run the SQL Script

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/sql/fix_checkly_test_co_permissions.sql`
4. Click "Run" to execute

### Step 2: Verify User Profiles

After running the script, check the output for:

- Users with missing `company_id`
- Users with invalid `company_id` references

If any users have missing `company_id`, update them:

```sql
-- Find the company ID for "Checkly Test Co"
SELECT id, name FROM public.companies WHERE name ILIKE '%checkly%test%';

-- Update user's company_id (replace USER_ID and COMPANY_ID)
UPDATE public.profiles
SET company_id = 'COMPANY_ID_HERE'
WHERE id = 'USER_ID_HERE';
```

### Step 3: Test Functionality

1. **Test Clock-In:**
   - Log in as a non-admin user
   - Try to clock in
   - Should work without errors

2. **Test Conversations:**
   - Log in as a non-admin user
   - Try to start a new conversation
   - Should be able to create and send messages

3. **Test Business Page:**
   - Log in as a non-admin user
   - Navigate to Business Details page
   - Should see company data

4. **Test COSHH Data Sheets:**
   - Log in as a non-admin user
   - Navigate to COSHH Data page
   - Check if COSHH sheets are visible
   - Try uploading/updating a sheet

## Troubleshooting

### If Clock-In Still Doesn't Work:

1. Check browser console for errors
2. Verify user has `company_id` set in profile
3. Check RLS policies on `staff_attendance` table:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'staff_attendance';
   ```

### If Conversations Still Don't Work:

1. Verify `conversations` table exists
2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'conversations';
   ```
3. Check `conversation_participants` policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'conversation_participants';
   ```

### If Business Page Still Doesn't Show Data:

1. Verify user has `company_id` set
2. Check RLS policies on `companies` table:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'companies';
   ```
3. Check if company data exists:
   ```sql
   SELECT * FROM public.companies WHERE name ILIKE '%checkly%test%';
   ```

## Files Modified

- `supabase/sql/fix_checkly_test_co_permissions.sql` - Comprehensive fix script

## Status

✅ **FIX SCRIPT CREATED** - Ready to run in Supabase SQL Editor

## Next Steps

1. Run the SQL script in Supabase Dashboard
2. Verify users have `company_id` set correctly
3. Test all functionality
4. Report any remaining issues









