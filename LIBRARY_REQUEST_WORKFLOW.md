# Library Request Workflow - Visual Guide

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CREATES REQUEST                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User fills out form:                                        │
│  • Library name: "Equipment Spares"                          │
│  • Fields: Part Number, Description, Quantity, Cost...       │
│  • Settings: CSV import/export, main table columns           │
│  • Clicks "Submit Request"                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  System:                                                     │
│  • Validates form data                                       │
│  • Generates SQL (client-side)                               │
│  • Creates record in library_requests table                  │
│  • Status = 'pending'                                        │
│  • Triggers notification to Checkly                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CHECKLY RECEIVES NOTIFICATION                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Checkly Admin Dashboard:                                    │
│  • Notification: "New Library Request: Equipment Spares"     │
│  • Shows: Company name, requester, library details           │
│  • Click to review full request                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CHECKLY REVIEWS REQUEST                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────────────┐           ┌───────────────────────┐
│   REJECT              │           │   APPROVE             │
│                       │           │                       │
│ • Add rejection       │           │ • Review generated    │
│   reason              │           │   SQL                 │
│ • Status → 'rejected' │           │ • Edit if needed      │
│ • User notified       │           │ • Status → 'approved' │
└───────────────────────┘           └───────────────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │   CHECKLY DEPLOYS             │
                            └───────────────────────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │  Option A: Manual             │
                            │  • Copy SQL to Supabase       │
                            │  • Execute in SQL Editor      │
                            │  • Verify table creation      │
                            │  • Mark as deployed in UI     │
                            └───────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│              USER RECEIVES NOTIFICATION                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User Notification:                                          │
│  "Your library 'Equipment Spares' is now live!              │
│   You can start adding items."                               │
│                                                              │
│  [Go to Library] button                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  User can now:                                               │
│  • Access library at /dashboard/libraries/equipment-spares   │
│  • Add items via inline editing                              │
│  • Import/export CSV                                         │
│  • Full CRUD operations                                      │
└─────────────────────────────────────────────────────────────┘
```

## Timeline Example

**Day 1, 10:00 AM**: User submits "Equipment Spares" library request

- Status: `pending`
- Notification sent to Checkly admins

**Day 1, 2:30 PM**: Checkly admin reviews request

- Opens request detail page
- Reviews generated SQL (looks good)
- Clicks "Approve"
- Status: `approved`
- User notified: "Your request has been approved"

**Day 1, 3:00 PM**: Checkly admin deploys

- Copies SQL to Supabase SQL Editor
- Executes and verifies
- Clicks "Mark as Deployed"
- Status: `deployed`
- User notified: "Your library is now live!"

**Day 1, 3:05 PM**: User accesses library

- Clicks notification link
- Sees empty library page
- Starts adding items

## Status Transitions

```
pending → approved → deployed ✅
   ↓
rejected ❌
   ↓
cancelled (by user) ⚠️
```

## Notification Matrix

| Event                 | Recipient      | Type                       | Severity  |
| --------------------- | -------------- | -------------------------- | --------- |
| New request submitted | Checkly Admins | `library_request_pending`  | `info`    |
| Request approved      | User           | `library_request_approved` | `info`    |
| Request deployed      | User           | `library_request_deployed` | `info`    |
| Request rejected      | User           | `library_request_rejected` | `warning` |

## UI Pages Needed

1. **User: Create Request** (`/dashboard/libraries/create`)
   - Form-based library designer
   - Field builder
   - SQL preview
   - Submit button

2. **User: My Requests** (`/dashboard/libraries/my-requests`)
   - List of user's requests
   - Status badges
   - View details
   - Cancel pending requests

3. **Checkly: Requests Dashboard** (`/dashboard/admin/library-requests`)
   - List all requests
   - Filter by status
   - Sort by date
   - Quick actions

4. **Checkly: Request Detail** (`/dashboard/admin/library-requests/[id]`)
   - Full library definition
   - Generated SQL (editable)
   - Approve/Reject/Deploy buttons
   - History/logs

## Benefits of This Approach

✅ **Safety**: Human review prevents bad SQL
✅ **Quality**: Checkly ensures consistency
✅ **User Experience**: Users design, Checkly handles complexity
✅ **Flexibility**: Checkly can customize SQL
✅ **Audit Trail**: Complete history
✅ **Notifications**: Both sides stay informed
✅ **Professional**: Shows care for user needs

## Implementation Priority

**Phase 1: Core System**

1. Create `library_requests` table
2. Create notification triggers
3. Update notification types

**Phase 2: User UI**

1. Library request form page
2. My requests page
3. SQL generation engine

**Phase 3: Admin UI**

1. Requests dashboard
2. Request detail page
3. Approve/Reject/Deploy actions

**Phase 4: Polish**

1. Email notifications (optional)
2. Request templates
3. Analytics
