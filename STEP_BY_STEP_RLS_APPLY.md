# Step-by-Step: Apply RLS Policies (5 Minutes)

## 🎯 What We're Doing

Applying the authoritative RLS policies to fix all the conflicts and stop the fix-break cycle.

---

## Step 1: Open Supabase Dashboard (1 minute)

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"** (or use the existing query tab)

---

## Step 2: Copy the RLS Policy File (1 minute)

1. Open this file in your editor: `supabase/sql/rls_policies_authoritative.sql`
2. **Select All** (Ctrl+A)
3. **Copy** (Ctrl+C)

---

## Step 3: Paste and Run (2 minutes)

1. **Paste** the entire file into Supabase SQL Editor
2. **Click "Run"** (or press Ctrl+Enter)
3. **Wait** for it to complete

**Expected Result**:

- ✅ "Success. No rows returned" or similar success message
- ❌ If you see errors, note them down

---

## Step 4: Verify It Worked (1 minute)

Paste this into SQL Editor and run:

```sql
-- Check that policies were created
SELECT
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'companies', 'sites')
ORDER BY tablename, policyname;
```

**Expected Result**: You should see policies like:

- `profiles_select_own`
- `profiles_insert_own`
- `profiles_update_own`
- `companies_select_own_or_profile`
- `companies_insert_own`
- `companies_update_own_or_profile`
- `sites_select_company`
- `sites_insert_company`
- `sites_update_company`

---

## ✅ Done!

If you see the policies listed above, the RLS policies are now applied!

---

## 🚨 If You See Errors

### Error: "policy already exists"

**This is OK** - The script should handle this, but if you see it:

1. The script uses `DROP POLICY IF EXISTS` so it should work
2. If it still fails, the policies might have slightly different names
3. You can manually drop them first (see troubleshooting in APPLY_RLS_POLICIES.md)

### Error: "permission denied"

**Solution**: Make sure you're using Supabase Dashboard SQL Editor (it has admin access)

### Error: "relation does not exist"

**This is OK** - Some tables might not exist yet. The script uses `IF EXISTS` clauses.

---

## 🎯 Next Steps After RLS is Applied

1. ✅ Test that existing users can still log in
2. ✅ Test that new signups work
3. ✅ Run database checker (once env vars are set)
4. ✅ Run tests: `npm run test`

---

**Ready?** Let's do it! 🚀
