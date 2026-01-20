# Complete Messaging Access Fix

## Problem Summary

New employees are being created but **not automatically added to messaging channels**, causing:
- 403 errors when trying to send messages (RLS blocks because user isn't a channel member)
- 403 errors when typing (RLS blocks because user isn't a channel member)
- Users can't access messaging features

## Root Cause

When users are created via:
- `/api/users/create` (AddUserModal)
- `/dashboard/people/directory/new-site` (AddEmployeePage)
- Onboarding flow

They get a profile with `company_id`, but are **NOT** automatically added to any messaging channels. The RLS policies require channel membership to send messages.

## Complete Solution

### Step 1: Run Database Fixes (Do This First)

Run these SQL scripts in order in Supabase SQL Editor:

1. **`FIX_MESSAGING_RLS_ALLOW_SELF_ADD.sql`** - Fixes RLS policies and constraints
2. **`ADD_MESSAGING_TO_ONBOARDING.sql`** - Creates trigger to auto-add users to messaging
3. **`FIX_EXISTING_USERS_MESSAGING_ACCESS.sql`** - Grants messaging access to existing users

### Step 2: Verify Frontend Code

The frontend code has been updated:
- ✅ `src/hooks/useTypingIndicator.ts` - Uses `profile_id` instead of `user_id`
- ✅ `src/hooks/useMessages.ts` - Uses `sender_profile_id` correctly
- ✅ `src/app/api/users/create/route.ts` - Now adds users to messaging channels

### Step 3: Test

1. Create a new employee/user
2. Check if they're automatically added to a "General" messaging channel
3. Try sending a message
4. Try typing in a conversation

## What Each Script Does

### `FIX_MESSAGING_RLS_ALLOW_SELF_ADD.sql`
- Creates primary key on `typing_indicators (channel_id, profile_id)`
- Creates unique constraint on `messaging_channel_members (channel_id, profile_id)`
- Creates RLS policies that allow self-addition to channels
- Fixes all messaging RLS policies

### `ADD_MESSAGING_TO_ONBOARDING.sql`
- Creates a database trigger that automatically adds users to default messaging channel
- Runs whenever a profile gets a `company_id` (insert or update)
- Creates default "General" channel if it doesn't exist
- Adds user as member (admin role for Admins/Owners, member for others)

### `FIX_EXISTING_USERS_MESSAGING_ACCESS.sql`
- Finds all users with `company_id` but no channel memberships
- Creates default channels for companies that don't have them
- Adds all existing users to their company's default channel
- Grants messaging access retroactively

## For New Users Going Forward

After running these scripts:
- ✅ New users will automatically get messaging access via the trigger
- ✅ Existing users will get messaging access via the fix script
- ✅ RLS policies will allow messaging operations
- ✅ Frontend code uses correct column names

## Troubleshooting

If a specific user still can't access messaging:

1. Run `CHECK_USER_PROFILE_AND_ACCESS.sql` (replace email in script)
2. Run `FIX_USER_MESSAGING_ACCESS.sql` (replace email in script)

These will show you exactly what's missing and fix it.
