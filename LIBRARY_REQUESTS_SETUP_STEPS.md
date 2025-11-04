# Library Requests System - Setup Steps

## Overview

This system lets users request custom libraries, Checkly reviews them, and deploys them. Users get notified when ready.

## Step 1: Run SQL Migrations

Run these SQL files **in order** in your Supabase SQL Editor:

### 1.1 Create the Table

```sql
-- File: supabase/sql/create_library_requests_table.sql
```

**What it does:** Creates the `library_requests` table to store user requests.

**How to run:**

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `create_library_requests_table.sql`
3. Paste and click "Run"
4. Should see: "Success. No rows returned"

### 1.2 Set Up Notifications

```sql
-- File: supabase/sql/library_requests_notifications.sql
```

**What it does:**

- Updates notification types to include library request types
- Creates triggers that automatically notify Checkly admins when new requests are submitted
- Creates triggers that notify users when their request status changes

**How to run:**

1. Copy the entire contents of `library_requests_notifications.sql`
2. Paste in SQL Editor and click "Run"
3. Should see: "Success. No rows returned"

✅ **Setup Complete!** The database is ready.

---

## Step 2: Understand the Workflow

### How It Works:

```
USER                                    CHECKLY
  │                                        │
  ├─ 1. Designs library                    │
  │   (form with fields)                   │
  │                                        │
  ├─ 2. Submits request                    │
  │   → Status: "pending"                  │
  │                                        │
  │   ──────────────────────────────────→  │
  │                                        ├─ 3. Receives notification
  │                                        │   (in-app bell + notification)
  │                                        │
  │                                        ├─ 4. Reviews request
  │                                        │   (views SQL, details)
  │                                        │
  │                                        ├─ 5. Approves
  │                                        │   → Status: "approved"
  │   ←──────────────────────────────────  │
  │   ← Notification: "Request approved"   │
  │                                        │
  │                                        ├─ 6. Deploys SQL
  │                                        │   (copy to Supabase, execute)
  │                                        │   → Status: "deployed"
  │   ←──────────────────────────────────  │
  │   ← Notification: "Library is live!"   │
  │                                        │
  ├─ 7. Uses library                       │
  │   (adds items, imports CSV, etc.)      │
```

---

## Step 3: What Happens Next (Future Development)

### Currently Ready:

✅ Database table created
✅ Notification triggers working
✅ Automatic notifications to Checkly admins
✅ Automatic notifications to users

### Still Need to Build (UI Pages):

**For Users:**

1. **Library Request Form** (`/dashboard/libraries/create`)
   - Form to design library
   - Field builder
   - SQL preview
   - Submit button

2. **My Requests Page** (`/dashboard/libraries/my-requests`)
   - View own requests
   - See status (pending/approved/deployed/rejected)
   - Cancel pending requests

**For Checkly Admins:** 3. **Admin Requests Dashboard** (`/dashboard/admin/library-requests`)

- List all requests
- Filter by status
- Click to review

4. **Request Detail Page** (`/dashboard/admin/library-requests/[id]`)
   - View full request details
   - See generated SQL
   - Buttons: Approve, Reject, Mark as Deployed

**Backend:** 5. **SQL Generation Engine**

- JavaScript function
- Takes library definition → generates SQL
- Matches patterns from existing libraries

---

## Step 4: Test the System

### Test Notification Triggers:

1. **Manually insert a test request:**

```sql
INSERT INTO library_requests (
  company_id,
  requested_by,
  library_name,
  table_name,
  description,
  fields,
  status
) VALUES (
  'YOUR_COMPANY_ID',  -- Replace with actual company_id
  'YOUR_USER_ID',     -- Replace with actual user_id
  'Test Library',
  'test_library',
  'This is a test library request',
  '[]'::jsonb,
  'pending'
);
```

2. **Check notifications:**

```sql
-- Should see notifications for Checkly admins
SELECT * FROM notifications
WHERE type = 'library_request_pending'
ORDER BY created_at DESC;
```

3. **Test status change:**

```sql
-- Update status (as admin)
UPDATE library_requests
SET status = 'approved',
    reviewed_by = 'YOUR_USER_ID',
    reviewed_at = NOW()
WHERE library_name = 'Test Library';

-- Should see user notification
SELECT * FROM notifications
WHERE type = 'library_request_approved'
ORDER BY created_at DESC;
```

---

## Step 5: Verify Everything Works

### Check Table Exists:

```sql
SELECT * FROM library_requests LIMIT 1;
```

### Check Triggers Exist:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'library_requests';
```

**Should see:**

- `trigger_notify_checkly_library_request`
- `trigger_notify_user_library_status`

### Check Policies Exist:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'library_requests';
```

**Should see 4 policies:**

- Users can view library requests from their own company
- Users can create library requests for their own company
- Users can update their own pending requests
- Admins can view all library requests
- Admins can update library requests

---

## Quick Reference

### Table: `library_requests`

**Key Columns:**

- `id` - Unique request ID
- `company_id` - Which company requested it
- `requested_by` - User who requested it
- `library_name` - Human-readable name
- `table_name` - Database table name (sanitized)
- `fields` - JSONB array of field definitions
- `generated_sql` - SQL migration script
- `status` - pending / approved / deployed / rejected / cancelled

### Status Flow:

```
pending → approved → deployed ✅
   ↓
rejected ❌
   ↓
cancelled (by user) ⚠️
```

### Notification Types Added:

- `library_request_pending` - Sent to Checkly admins
- `library_request_approved` - Sent to user
- `library_request_deployed` - Sent to user
- `library_request_rejected` - Sent to user

---

## Troubleshooting

### Error: "column role does not exist"

✅ **Fixed!** Now uses `app_role` instead of `role`

### Notifications not sending?

- Check if Checkly company exists: `SELECT * FROM companies WHERE name ILIKE '%checkly%';`
- Check if Checkly has admin users: `SELECT * FROM profiles WHERE company_id = 'CHECKLY_COMPANY_ID' AND LOWER(app_role) IN ('owner', 'admin');`

### Can't see requests?

- Check RLS policies are applied
- Verify user's company_id matches request's company_id
- For admins: verify `app_role` is 'Admin' or 'Owner' (case-insensitive)

---

## Next Steps (After Setup)

1. Build the UI pages (listed in Step 3)
2. Create SQL generation engine
3. Test end-to-end workflow
4. Deploy to production

---

## Files Reference

- `supabase/sql/create_library_requests_table.sql` - Main table
- `supabase/sql/library_requests_notifications.sql` - Notification triggers
- `LIBRARY_REQUEST_SYSTEM_DESIGN.md` - Full design document
- `LIBRARY_REQUEST_WORKFLOW.md` - Visual workflow guide
