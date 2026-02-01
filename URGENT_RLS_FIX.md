# URGENT: RLS Infinite Recursion Fix

## Critical Issue

The RLS policies are causing infinite recursion because the security definer functions are still triggering RLS when querying `profiles`.

## Root Cause

Security definer functions need `SET search_path = public` and must be written in `plpgsql` (not `sql`) to properly bypass RLS.

## Immediate Action Required

**Run this SQL script in Supabase SQL Editor immediately:**

```sql
-- Drop and recreate functions with proper RLS bypass
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.is_user_admin_or_manager();

-- Get user's company_id
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN result;
END;
$$;

-- Check if user has admin/manager/owner role
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(app_role::text) IN ('owner', 'admin', 'manager')
  ) INTO result;

  RETURN COALESCE(result, false);
END;
$$;
```

**OR run the complete fix script:**
`supabase/sql/fix_profiles_rls_company_access.sql`

## Why This Fixes It

1. **`SET search_path = public`**: Ensures the function uses the correct schema
2. **`LANGUAGE plpgsql`**: Allows proper variable handling and RLS bypass
3. **`SECURITY DEFINER`**: Runs with the privileges of the function creator (bypasses RLS)
4. **Explicit variable handling**: Uses `DECLARE` and `INTO` to avoid query execution issues

## After Running

The infinite recursion errors should stop immediately. All profile queries will work correctly.












