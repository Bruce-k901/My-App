# Manual Database Sync Instructions

Since the Supabase CLI commands are hanging, here's how to manually sync your database:

## Step 1: Apply Notification System Migrations

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
2. **Go to SQL Editor**
3. **Open the file**: `APPLY_NOTIFICATION_SYSTEM_MANUAL.sql`
4. **Copy the entire contents** and paste into SQL Editor
5. **Click "Run"**

This will create:

- ✅ `attendance_logs` table (clock-in system)
- ✅ `push_subscriptions` table
- ✅ Notification functions
- ✅ Message notification trigger

## Step 2: Set Up Cron Job (Optional - Choose One Method)

### Option A: Supabase Dashboard Scheduling (Recommended)

1. Go to **Edge Functions** → **check-task-notifications**
2. Click **"Schedule"** or **"Add Schedule"**
3. Configure:
   - **Name**: `check-task-notifications-schedule`
   - **Cron Expression**: `*/15 * * * *` (Every 15 minutes)
   - **Authorization**: `Bearer YOUR_SERVICE_ROLE_KEY`
   - **Method**: `POST`
4. Click **"Save"**

### Option B: SQL Cron Job (If you prefer pg_cron)

1. **Get your Service Role Key**:
   - Dashboard → Settings → API → Copy `service_role` key

2. **Run this SQL** (replace `YOUR_SERVICE_ROLE_KEY`):

   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   CREATE EXTENSION IF NOT EXISTS http;

   SELECT cron.schedule(
     'check-task-notifications-cron',
     '*/15 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
       )
     ) AS request_id;
     $$
   );
   ```

## Step 3: Verify Everything Works

Run these verification queries in SQL Editor:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('attendance_logs', 'push_subscriptions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_user_clocked_in', 'create_task_ready_notification', 'create_late_task_notification');

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trg_notify_message_recipients';

-- Check edge function is deployed
-- Go to Edge Functions → check-task-notifications → Should show "Deployed"
```

## Step 4: Test the System

**Use the test file**: `TEST_NOTIFICATION_SYSTEM.sql` - This file contains proper test queries with instructions.

### Quick Test Steps:

1. **Get real IDs** - Run the "Quick Test" query at the bottom of `TEST_NOTIFICATION_SYSTEM.sql` to get actual UUIDs from your database

2. **Test clock-in**:

   ```sql
   -- First get IDs from the quick test query, then:
   INSERT INTO attendance_logs (user_id, company_id, site_id)
   VALUES (
     'PASTE_USER_ID_FROM_QUERY'::uuid,
     'PASTE_COMPANY_ID_FROM_QUERY'::uuid,
     'PASTE_SITE_ID_FROM_QUERY'::uuid
   );
   ```

3. **Test notification function** (use real IDs from your database):

   ```sql
   SELECT create_task_ready_notification(
     'PASTE_TASK_ID_FROM_QUERY'::uuid,
     'PASTE_COMPANY_ID_FROM_QUERY'::uuid,
     'PASTE_SITE_ID_FROM_QUERY'::uuid,
     'PASTE_USER_ID_FROM_QUERY'::uuid,
     'Test Task',
     '14:00'
   );
   ```

4. **Test edge function manually**:
   ```bash
   curl -X POST https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

**Important**: Always use actual UUIDs from your database, not placeholder strings like "task-id"!

## Troubleshooting

### If tables already exist:

The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### If functions already exist:

The script uses `CREATE OR REPLACE FUNCTION` so it will update existing functions.

### If you get permission errors:

Make sure you're running as a user with proper permissions (usually `postgres` role in SQL Editor).

## Next Steps After Sync

1. ✅ Add `<NotificationInitializer />` to your app
2. ✅ Add `<ClockInButton />` component
3. ✅ Test the full notification flow
