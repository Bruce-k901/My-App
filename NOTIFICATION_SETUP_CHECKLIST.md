# Notification System Setup Checklist

## ✅ What's Already Done

### 1. Database Migrations Created ✅

- ✅ `20250216000009_create_notification_system.sql` - Created
- ✅ `20250216000010_add_message_notification_trigger.sql` - Created
- ✅ `20250216000011_schedule_task_notification_cron.sql` - Created
- ✅ `APPLY_NOTIFICATION_SYSTEM_MANUAL.sql` - Consolidated manual script created

### 2. Edge Function ✅

- ✅ `check-task-notifications` function created
- ✅ Function deployed to Supabase
- ✅ Function code is correct

### 3. Client-Side Components ✅

- ✅ `src/lib/notifications/pushNotifications.ts` - Created
- ✅ `src/lib/notifications/attendance.ts` - Created
- ✅ `src/hooks/useAttendance.ts` - Created
- ✅ `src/components/notifications/NotificationInitializer.tsx` - Created
- ✅ `src/components/notifications/ClockInButton.tsx` - Created

### 4. VAPID Keys ✅

- ✅ Keys generated
- ✅ Documentation created (`ADD_VAPID_TO_ENV.md`)

### 5. Service Worker ✅

- ✅ `public/sw.js` - Has push notification handler

---

## ⚠️ What Needs to Be Done

### 1. Database Migrations - NEEDS ACTION ⚠️

**Status**: Migrations created but may not be applied to database

**Action Required**:

1. Run `APPLY_NOTIFICATION_SYSTEM_MANUAL.sql` in Supabase SQL Editor
   - Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
   - SQL Editor → Run the script

**Verify**:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('attendance_logs', 'push_subscriptions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_user_clocked_in', 'create_task_ready_notification');
```

### 2. Add NotificationInitializer to Layout - NEEDS ACTION ⚠️

**Status**: Component exists but not added to root layout

**Action Required**:
Add to `src/app/layout.tsx`:

```tsx
import { NotificationInitializer } from "@/components/notifications/NotificationInitializer";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>...</head>
      <body className="bg-neutral-950 text-white font-sans">
        <ErrorBoundary>
          <ReactQueryProvider>
            <QueryProvider>
              <AppProvider>
                <PWAProvider />
                <NotificationInitializer /> {/* ADD THIS */}
                <RouteLogger />
                {children}
                <Footer />
                <Toaster position="top-right" richColors />
              </AppProvider>
            </QueryProvider>
          </ReactQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### 3. Add ClockInButton to Header - NEEDS ACTION ⚠️

**Status**: Component exists but not added to dashboard header

**Action Required**:
Add to `src/components/layouts/DashboardHeader.tsx`:

```tsx
import { ClockInButton } from "@/components/notifications/ClockInButton";

// In the header component, add:
<ClockInButton />;
```

### 4. VAPID Keys in .env.local - NEEDS VERIFICATION ⚠️

**Status**: Keys generated, but need to verify they're in `.env.local`

**Action Required**:

1. Check `.env.local` has:

   ```bash
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDrNyYQVW6601ShCx9AgL96dx5dtwl_s6rmivg_7xJBWG7s0oI6sgIREmU9PypeKHufuuHp0yhhmfZTjX1J4skk
   VAPID_PRIVATE_KEY=4mP-oWLcV7bjTQuMPrKq7K_Klx9KvZea1rVlIkrUEmw
   ```

2. Add to Supabase Edge Function secrets:
   - Dashboard → Edge Functions → check-task-notifications → Settings
   - Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

### 5. Cron Job Setup - NEEDS ACTION ⚠️

**Status**: Migration created but needs to be run

**Two Options**:

**Option A: Supabase Dashboard (Recommended)**

1. Go to Edge Functions → check-task-notifications
2. Click "Schedule"
3. Set cron: `*/15 * * * *` (every 15 minutes)
4. Add Authorization header with service role key

**Option B: SQL Migration**

1. Update `20250216000011_schedule_task_notification_cron.sql`
2. Replace `YOUR_SERVICE_ROLE_KEY` with actual key
3. Run migration

---

## Testing Checklist

After completing setup:

### 1. Test Clock-In ✅

- [ ] User can clock in
- [ ] Clock-in status displays correctly
- [ ] User can clock out

### 2. Test Push Notifications ✅

- [ ] Browser prompts for notification permission
- [ ] Permission granted
- [ ] Subscription saved to database
- [ ] Push notification received

### 3. Test Task Notifications ✅

- [ ] Create task with due_time = current time + 1 hour
- [ ] Clock in as assigned user
- [ ] Wait for cron job (or trigger manually)
- [ ] Notification created
- [ ] Push notification received

### 4. Test Message Notifications ✅

- [ ] Send message in conversation
- [ ] Notification created for recipient
- [ ] Push notification received

### 5. Test Late Task Notifications ✅

- [ ] Create task with due_time = current time - 2 hours
- [ ] Clock in as manager
- [ ] Wait for cron job
- [ ] Manager receives notification

---

## Quick Setup Summary

1. ✅ **Run database migrations** - `APPLY_NOTIFICATION_SYSTEM_MANUAL.sql`
2. ✅ **Add NotificationInitializer** to `src/app/layout.tsx`
3. ✅ **Add ClockInButton** to `src/components/layouts/DashboardHeader.tsx`
4. ✅ **Verify VAPID keys** in `.env.local` and Supabase secrets
5. ✅ **Set up cron job** via Dashboard or SQL migration
6. ✅ **Restart dev server** after adding components
7. ✅ **Test the system** using the test queries

---

## Files That Need Changes

1. `src/app/layout.tsx` - Add `<NotificationInitializer />`
2. `src/components/layouts/DashboardHeader.tsx` - Add `<ClockInButton />`
3. `.env.local` - Verify VAPID keys are present
4. Supabase Dashboard - Add VAPID keys to edge function secrets
5. Supabase Dashboard - Set up cron job schedule

---

## Current Status Summary

| Component           | Status                  | Action Needed                |
| ------------------- | ----------------------- | ---------------------------- |
| Database Migrations | ⚠️ Created, not applied | Run SQL script               |
| Edge Function       | ✅ Deployed             | None                         |
| Client Components   | ✅ Created              | Add to layout/header         |
| VAPID Keys          | ⚠️ Generated            | Add to .env.local & Supabase |
| Cron Job            | ⚠️ Migration created    | Set up schedule              |
| Service Worker      | ✅ Ready                | None                         |

**Overall Status**: ~70% Complete - Need to integrate components and apply migrations
