# Notification System Setup Guide

## Overview

This document describes the comprehensive notification system implemented for the Checkly application. The system handles three main notification types:

1. **Today's Tasks** - Notifications for tasks ready to complete (1hr before) and late tasks (1hr after)
2. **Late Tasks** - Manager notifications for tasks that are late
3. **Messages** - Notifications when new messages are received in the messaging portal

## Architecture

### Database Components

#### 1. Attendance/Clock-in System (`attendance_logs` table)

- Tracks when staff members clock in and out
- Includes location tracking (GPS coordinates)
- Used to determine who is "on shift" for notifications

#### 2. Push Notification Subscriptions (`push_subscriptions` table)

- Stores browser push notification subscriptions
- Links subscriptions to users
- Tracks device information

#### 3. Enhanced Notifications Table

- Added new notification types: `task_ready`, `task_late`, `message`, `message_mention`
- Added `task_id` and `conversation_id` references
- Added `push_sent` flag to track push notification delivery

### Key Functions

1. **`is_user_clocked_in(user_id, site_id)`** - Checks if user is currently clocked in
2. **`get_active_staff_on_site(site_id)`** - Returns all active staff on a site
3. **`get_managers_on_shift(site_id, company_id)`** - Returns managers currently on shift
4. **`create_task_ready_notification(...)`** - Creates notification when task is ready (1hr before)
5. **`create_late_task_notification(...)`** - Creates notifications for managers when task is late
6. **`create_message_notification(...)`** - Creates notification when message is received

### Edge Functions

- **`check-task-notifications`** - Runs periodically (via cron) to check task timings and create notifications

### Client-Side Components

- **`useAttendance` hook** - React hook for clock-in/out functionality
- **`ClockInButton` component** - UI component for clocking in/out
- **`NotificationInitializer` component** - Initializes push notifications on app load
- **Push notification service** - Handles browser push notification registration

## Setup Instructions

### 1. Database Migrations

Run the following migrations in order:

```bash
# Run migrations
supabase migration up
```

Migrations:

- `20250216000009_create_notification_system.sql` - Creates attendance system, push subscriptions, and notification functions
- `20250216000010_add_message_notification_trigger.sql` - Adds trigger for message notifications

### 2. Environment Variables

Add the following to your `.env.local`:

```bash
# VAPID keys for push notifications (generate using web-push library)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

To generate VAPID keys:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 3. Edge Function Deployment

Deploy the task notification checker edge function:

```bash
supabase functions deploy check-task-notifications
```

### 4. Cron Job Setup

Set up a cron job to run the task notification checker every 15 minutes:

```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'check-task-notifications',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/check-task-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);
```

### 5. Add Components to App

Add the notification initializer to your root layout:

```tsx
// src/app/layout.tsx
import { NotificationInitializer } from "@/components/notifications/NotificationInitializer";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationInitializer />
        {children}
      </body>
    </html>
  );
}
```

Add clock-in button to your header or dashboard:

```tsx
import { ClockInButton } from "@/components/notifications/ClockInButton";

// In your header component
<ClockInButton />;
```

## How It Works

### Task Notifications

1. **Task Ready (1 hour before due time)**
   - Edge function runs every 15 minutes
   - Checks all tasks due today with a `due_time`
   - For tasks entering the "ready" window (1hr before due time):
     - Checks if assigned user is clocked in
     - Creates notification if user is clocked in
     - Sends push notification

2. **Task Late (1 hour after due time)**
   - Edge function detects tasks past the window
   - Finds all managers on shift for the task's site
   - Creates notifications for each manager
   - Sends push notifications

### Message Notifications

- Triggered automatically when a message is inserted
- Creates notification for all conversation participants (except sender)
- Sends push notification immediately

### Push Notifications

- Registered when user first loads the app (if permission granted)
- Stored in `push_subscriptions` table
- Sent via edge function when notifications are created
- Uses browser's native push notification API

## Notification Flow

```
1. Event occurs (task ready/late, message received)
   ↓
2. Database function creates notification record
   ↓
3. Edge function checks for pending notifications
   ↓
4. Edge function sends push notifications to subscribed users
   ↓
5. Browser displays notification
   ↓
6. User clicks notification → Opens app to relevant page
```

## Testing

### Test Clock-in

1. Select a site
2. Click "Clock In" button
3. Verify attendance log is created
4. Verify clock-in status updates

### Test Task Notifications

1. Create a task with due_time = current time + 1 hour
2. Clock in as assigned user
3. Wait for notification checker to run (or trigger manually)
4. Verify notification is created
5. Verify push notification is received

### Test Message Notifications

1. Send a message in a conversation
2. Verify notification is created for recipient
3. Verify push notification is received

## Troubleshooting

### Push Notifications Not Working

1. Check browser console for service worker errors
2. Verify VAPID keys are set correctly
3. Check if user granted notification permission
4. Verify push subscription exists in database

### Notifications Not Created

1. Check if user is clocked in (for task notifications)
2. Verify task has `due_time` set
3. Check edge function logs
4. Verify cron job is running

### Clock-in Not Working

1. Verify user has a site selected
2. Check if user already clocked in today
3. Verify RLS policies allow insert

## Future Enhancements

- [ ] Email notifications for critical alerts
- [ ] SMS notifications (via Twilio)
- [ ] Notification preferences per user
- [ ] Notification grouping/batching
- [ ] Rich notifications with images
- [ ] Notification history/archive
