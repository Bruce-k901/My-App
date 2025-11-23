# 🔧 Supabase CLI "Initialising login role" Fix

## 🐛 The Problem

When running `supabase db push`, it gets stuck on "Initialising login role..."
indefinitely.

This is a known issue with Supabase CLI when:

- Local Supabase is running but not properly configured
- Database connection pooling issues
- Authentication problems with remote database

## ✅ Solutions (Try in Order)

### **Solution 1: Use SQL Editor Instead** ⭐ EASIEST

**This bypasses the CLI entirely!**

1. Open: `scripts/setup-cron-simple.sql`
2. Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key
3. Copy the entire file contents
4. Go to: Supabase Dashboard → SQL Editor
5. Paste and click "Run"
6. ✅ Done!

**This is the recommended approach** - no CLI needed!

---

### **Solution 2: Reset Supabase CLI**

If you really want to use the CLI, try this:

```powershell
# 1. Stop local Supabase
supabase stop

# 2. Unlink the project
supabase unlink

# 3. Re-link with your project
supabase link --project-ref xijoybubtrgbrhquqwrx

# When prompted for database password:
# - Go to: Supabase Dashboard → Settings → Database
# - Copy the database password (NOT the service role key)
# - Paste it when prompted

# 4. Try pushing again
supabase db push --linked
```

---

### **Solution 3: Use Direct Database URL**

If Solution 2 doesn't work:

```powershell
# Get your database password from Supabase Dashboard → Settings → Database

# Build the connection string (replace YOUR_PASSWORD):
$dbUrl = "postgresql://postgres.xijoybubtrgbrhquqwrx:YOUR_PASSWORD@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

# Push using direct URL
supabase db push --db-url $dbUrl --include-all
```

---

### **Solution 4: Manual psql Connection**

If all else fails, connect directly with psql:

```powershell
# Install psql if you don't have it (via PostgreSQL installer)

# Connect to remote database (replace YOUR_PASSWORD):
psql "postgresql://postgres.xijoybubtrgbrhquqwrx:YOUR_PASSWORD@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

# Once connected, paste the contents of:
# supabase/migrations/20251123000001_enable_edge_function_cron.sql

# Or run:
\i supabase/migrations/20251123000001_enable_edge_function_cron.sql
```

---

## 🎯 Recommended Approach

**Just use the SQL Editor!** It's faster and more reliable:

1. ✅ No CLI issues
2. ✅ No password management
3. ✅ Works every time
4. ✅ Can see results immediately

**Steps:**

1. Edit `scripts/setup-cron-simple.sql`
2. Replace the service role key
3. Copy & paste into Supabase SQL Editor
4. Click "Run"
5. Done!

---

## 📋 What You Need

Depending on which solution you choose:

| Solution       | What You Need     | Where to Find It                          |
| -------------- | ----------------- | ----------------------------------------- |
| **SQL Editor** | Service Role Key  | Dashboard → Settings → API → service_role |
| **CLI Reset**  | Database Password | Dashboard → Settings → Database           |
| **Direct URL** | Database Password | Dashboard → Settings → Database           |
| **psql**       | Database Password | Dashboard → Settings → Database           |

---

## ⚠️ Important Notes

1. **Service Role Key** ≠ **Database Password**
   - Service role key: For API calls (starts with `eyJ...`)
   - Database password: For direct database connections

2. **Never commit secrets to git**
   - Don't save passwords in files
   - Use environment variables
   - Keep `.env.local` in `.gitignore`

3. **SQL Editor is the easiest**
   - No CLI setup needed
   - No password management
   - Works in the browser
   - Instant feedback

---

## 🆘 Still Stuck?

If the CLI is still not working:

1. **Check Supabase CLI version**:

   ```powershell
   supabase --version
   ```

   Should be 2.x or higher

2. **Update Supabase CLI**:

   ```powershell
   scoop update supabase
   # or
   brew upgrade supabase
   # or download from: https://github.com/supabase/cli/releases
   ```

3. **Check Docker is running** (if using local Supabase):

   ```powershell
   docker ps
   ```

4. **Just use SQL Editor** 😊
   - Seriously, it's easier!

---

## ✅ Success Indicators

After applying the migration (via any method):

```sql
-- Run this in SQL Editor to verify:
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'generate-daily-tasks-http';
```

Should return 1 row showing:

- `jobname`: `generate-daily-tasks-http`
- `schedule`: `0 3 * * *`
- `active`: `true`

---

## 📚 Related Files

- `scripts/setup-cron-simple.sql` - SQL to paste in editor
- `QUICK_ACTION_GUIDE.md` - Quick reference
- `CRON_ISSUES_FIXED.md` - Full documentation
