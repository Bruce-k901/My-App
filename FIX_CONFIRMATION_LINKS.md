# 🔧 Fix Confirmation Links in Emails

## Problem

You're seeing the fallback text instead of the confirmation buttons:
```
📧 Please Confirm Your Attendance 
Please reply to this email...
```

## Cause

The `confirmation_token` column hasn't been added to your database yet, or existing applications don't have tokens.

## Solution

Run these SQL scripts in Supabase SQL Editor **in this order**:

### **Step 1: Apply Confirmation System**

Run: `APPLY_CONFIRMATION_SYSTEM.sql`

This adds:
- `confirmation_token` column to applications
- `application_confirmation_responses` table
- RLS policies

### **Step 2: Generate Tokens for Existing Applications**

Run: `GENERATE_CONFIRMATION_TOKENS.sql`

This:
- Adds tokens to all existing applications
- Shows count of applications with/without tokens
- Displays sample applications

### **Step 3: Test**

1. Go to a candidate profile
2. Schedule an interview or trial
3. Check the email
4. You should now see:

```
┌──────────────┐  ┌──────────────┐
│ ✓ Confirm    │  │ 🔄 Request   │
│   Attendance │  │   Changes    │
└──────────────┘  └──────────────┘

Or copy this link: https://yourapp.com/confirm/[token]
```

## Quick Check

Run this in Supabase SQL Editor to check if tokens exist:

```sql
SELECT 
  COUNT(*) as total,
  COUNT(confirmation_token) as with_tokens
FROM public.applications;
```

**Expected result:**
- `total` = number of applications
- `with_tokens` = should equal `total`

If `with_tokens` is less than `total`, run `GENERATE_CONFIRMATION_TOKENS.sql`

## Files Needed

1. `APPLY_CONFIRMATION_SYSTEM.sql` - Creates the system
2. `GENERATE_CONFIRMATION_TOKENS.sql` - Adds tokens to existing apps

Both files are in your project root.

## After Running

All new applications will automatically get a confirmation token when created (thanks to the `DEFAULT gen_random_uuid()` in the migration).

All emails (interview, trial, offer) will show the confirmation buttons with working links!

---

**Status:** Run the SQL scripts and you're done! ✅
