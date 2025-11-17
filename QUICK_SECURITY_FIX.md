# Quick Security Fix Guide

## 🚀 Quick Start

### Step 1: Fix RLS Issues (5 minutes)

Run `FIX_SECURITY_ISSUES.sql` in Supabase SQL Editor.

This fixes:

- ✅ Enables RLS on 6 active tables
- ✅ Creates missing RLS policies
- ✅ Fixes 4 insecure user_metadata policies
- ✅ Fixes 2 security definer views

### Step 2: Handle Legacy Tables (2 minutes)

**Option A - Drop unused tables** (recommended):

```sql
-- Run DROP_LEGACY_TABLES.sql
```

**Option B - Enable RLS on them**:

```sql
-- Already included in FIX_SECURITY_ISSUES.sql
```

### Step 3: Fix Remaining Views (10 minutes)

1. Run this query to get view definitions:

```sql
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('ppm_schedule', 'profile_settings', 'ppm_full_schedule', 'v_current_profile', 'v_user_sites');
```

2. For each view, drop and recreate without SECURITY DEFINER:

```sql
DROP VIEW IF EXISTS public.view_name CASCADE;
CREATE VIEW public.view_name AS <definition>;
```

## 📋 What Gets Fixed

### Tables Fixed ✅

- `assets` - RLS enabled + policies created
- `conversations` - RLS enabled
- `contractors` - RLS enabled + policies created
- `site_closures` - RLS enabled + policies created
- `archived_users` - RLS enabled + policies verified
- `troubleshooting_questions` - RLS enabled + policies created

### Policies Fixed ✅

- `profiles: select by company` - Now uses company_id from profiles
- `profiles: update by admins/managers` - Now uses company_id from profiles
- `profiles: self-update` - Now uses auth.uid() directly
- `sites: select by company` - Now uses company_id from profiles

### Views Fixed ✅

- `site_compliance_score_latest` - Recreated without SECURITY DEFINER
- `tenant_compliance_overview` - Recreated without SECURITY DEFINER

## ⚠️ What Still Needs Manual Fix

These views need their definitions retrieved and recreated:

- `ppm_schedule`
- `profile_settings`
- `ppm_full_schedule`
- `v_current_profile`
- `v_user_sites`

See `FIX_SECURITY_DEFINER_VIEWS.sql` for instructions.

## 🧪 Testing

After running fixes, test:

1. Can you query assets? ✅
2. Can you query conversations? ✅
3. Can you query contractors? ✅
4. Can you only see your company's data? ✅
5. Can managers update profiles? ✅

## 📁 Files

- `FIX_SECURITY_ISSUES.sql` - Main fix script ⭐
- `DROP_LEGACY_TABLES.sql` - Drop unused tables
- `FIX_SECURITY_DEFINER_VIEWS.sql` - View fix helper
- `SECURITY_FIXES_SUMMARY.md` - Detailed summary
- `SECURITY_FIX_ANALYSIS.md` - Analysis of issues
