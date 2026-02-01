# Debugging Stock Count Notifications

## What Should Happen

When a stock count is approved or rejected, three notifications should be created:

1. **In-App Notification** - Shows in the notifications page
2. **Msgly Message** - Shows in the "Opsly Platform" channel in messaging
3. **Calendar Task** - Shows in the calendar page with a link to the stock count

## How to Check

### 1. Check Server Logs

After approving/rejecting, check the server console for:

- ✅ Messages showing successful creation
- ❌ Error messages showing what failed

### 2. Check Messaging

- Go to `/dashboard/messaging`
- Look for a channel named **"Opsly Platform"**
- If you don't see it, the channel might not have been created or you're not a member
- Check browser console for any errors

### 3. Check Calendar

- Go to `/dashboard/calendar`
- Look for tasks assigned to you (the counter)
- Tasks should have:
  - Green color for approved counts
  - Red color for rejected counts
  - Clickable links to the stock count

### 4. Check In-App Notifications

- Go to `/dashboard/notifications` or check the notifications bell icon
- Should see notifications about stock count approval/rejection

## Common Issues

### Channel Not Visible

- The "Opsly Platform" channel might be filtered out
- Check if you're a member: Look in `messaging_channel_members` table
- Channel might be archived: Check `archived_at` is NULL

### Calendar Task Not Showing

- Check `profile_settings` table for key `handover:YYYY-MM-DD`
- Verify `assignedTo` matches your user ID
- Check if task is filtered out (only shows tasks assigned to you or unassigned)

### Message Not Appearing

- Check `messaging_messages` table for the message
- Verify `channel_id` matches the "Opsly Platform" channel
- Check `sender_name` in metadata is "Opsly Platform"

## Database Queries to Run

```sql
-- Check if Opsly Platform channel exists
SELECT id, name, channel_type, company_id, last_message_at
FROM messaging_channels
WHERE name = 'Opsly Platform'
AND company_id = 'YOUR_COMPANY_ID';

-- Check if you're a member
SELECT mcm.*, p.full_name
FROM messaging_channel_members mcm
JOIN messaging_channels mc ON mc.id = mcm.channel_id
JOIN profiles p ON p.id = mcm.profile_id
WHERE mc.name = 'Opsly Platform'
AND mcm.profile_id = 'YOUR_USER_ID';

-- Check recent messages in Opsly Platform channel
SELECT mm.*, mc.name as channel_name
FROM messaging_messages mm
JOIN messaging_channels mc ON mc.id = mm.channel_id
WHERE mc.name = 'Opsly Platform'
ORDER BY mm.created_at DESC
LIMIT 10;

-- Check calendar tasks
SELECT key, value->'tasks' as tasks
FROM profile_settings
WHERE key LIKE 'handover:%'
AND company_id = 'YOUR_COMPANY_ID'
ORDER BY key DESC
LIMIT 5;
```
