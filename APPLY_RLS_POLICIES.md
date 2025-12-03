# Apply Authoritative RLS Policies - Step by Step

## 🎯 Goal

Apply the single source of truth RLS policies to fix all the conflicts.

## ⚠️ Important: Backup First!

Before making any changes, let's backup your current state:

### Option 1: Supabase Dashboard Backup

1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup (if available)

### Option 2: Export Current Policies (Recommended)

Run this in Supabase SQL Editor to see current policies:

```sql
-- See all current policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'companies', 'sites', 'assets',
        'contractors', 'tasks', 'incidents', 'temperature_logs',
        'site_daily_tasks', 'task_templates', 'notifications'
    )
ORDER BY tablename, policyname;
```

**Copy the results** - this is your backup!

---

## 🚀 Step 1: Apply the Authoritative Policies

### Option A: Using Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to your project
   - Click "SQL Editor" in the left sidebar

2. **Open the RLS Policy File**
   - Open `supabase/sql/rls_policies_authoritative.sql` in your editor
   - Copy the ENTIRE file contents

3. **Paste and Run**
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for "Success" message

4. **Verify It Worked**
   - You should see "Success. No rows returned" or similar
   - If you see errors, note them down

### Option B: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/my-app

# Apply the SQL file
supabase db execute -f supabase/sql/rls_policies_authoritative.sql
```

---

## ✅ Step 2: Verify Policies Are Applied

Run this in Supabase SQL Editor:

```sql
-- Check that RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'companies', 'sites', 'assets',
        'contractors', 'tasks', 'incidents', 'temperature_logs',
        'site_daily_tasks', 'task_templates', 'notifications'
    )
ORDER BY tablename;
```

**Expected Result**: All tables should show `rls_enabled = true`

---

## ✅ Step 3: Check Policies Exist

Run this in Supabase SQL Editor:

```sql
-- Check that policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'companies', 'sites', 'assets',
        'contractors', 'tasks', 'incidents', 'temperature_logs',
        'site_daily_tasks', 'task_templates', 'notifications'
    )
ORDER BY tablename, policyname;
```

**Expected Result**: You should see policies like:

- `profiles_select_own`
- `profiles_insert_own`
- `profiles_update_own`
- `companies_select_own_or_profile`
- `companies_insert_own`
- `companies_update_own_or_profile`
- And many more...

---

## 🧪 Step 4: Test the Policies Work

### Test 1: User Can Access Their Own Company

1. **Get a test user ID** (or use your own):

   ```sql
   SELECT id, email FROM auth.users LIMIT 1;
   ```

2. **Check their profile**:

   ```sql
   SELECT id, company_id FROM profiles WHERE id = 'USER_ID_HERE';
   ```

3. **Check they can access their company** (this should work):
   ```sql
   -- This query simulates what a user would see
   -- Run as that user (you'll need to test in your app)
   ```

### Test 2: Run Database State Checker

```bash
npm run check:db
```

This will verify:

- All profiles have company_id
- All companies have user_id or created_by
- No orphaned records
- Data consistency

---

## 🚨 Troubleshooting

### Error: "policy already exists"

**Solution**: The script should handle this with `DROP POLICY IF EXISTS`, but if you see this error:

1. The policies might have different names
2. Manually drop them first:

```sql
-- Drop all policies on companies table
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;
-- Then re-run the authoritative file
```

### Error: "permission denied"

**Solution**: Make sure you're using:

- Supabase Dashboard SQL Editor (has admin access)
- Or Supabase CLI with proper credentials

### Error: "relation does not exist"

**Solution**: Some tables might not exist yet. That's okay - the script uses `IF EXISTS` clauses. The policies will be created when the tables are created.

---

## ✅ Success Checklist

After applying, verify:

- [ ] No errors when running the SQL file
- [ ] RLS is enabled on all critical tables
- [ ] Policies exist for all tables
- [ ] `npm run check:db` passes (or shows only expected issues)
- [ ] Existing users can still access their data
- [ ] New signups work correctly

---

## 🎯 Next Steps

After RLS policies are applied:

1. ✅ **Check Database State**: `npm run check:db`
2. ✅ **Run Tests**: `npm run test`
3. ✅ **Test Onboarding**: Try creating a new user
4. ✅ **Update Onboarding Service**: Use the new service in your signup flow

---

## 📝 Notes

- The authoritative file **drops all existing policies** first, so you start clean
- Policies are created in the correct order (profiles → companies → sites → assets)
- Onboarding edge cases are handled (user_id and created_by checks)
- All policies include proper indexes for performance

---

**Ready?** Let's apply the policies! 🚀
