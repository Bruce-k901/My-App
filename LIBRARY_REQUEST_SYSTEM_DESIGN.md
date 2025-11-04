# Library Request System - Design Document

## Overview

A complete workflow system where users design custom libraries through a UI, Checkly developers review and deploy them, and users are notified when ready.

## Workflow

```
1. User designs library → 2. Submits request → 3. Notification to Checkly
                                                      ↓
6. User notified ← 5. Checkly deploys SQL ← 4. Checkly reviews/approves
```

## Database Schema

### Table: `library_requests`

```sql
CREATE TABLE library_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),

  -- Library Definition
  library_name TEXT NOT NULL,
  table_name TEXT NOT NULL,  -- sanitized, e.g., "equipment_spares_library"
  description TEXT,

  -- Field Definitions (stored as JSONB)
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  Example fields structure:
  [
    {
      "name": "Part Number",
      "column": "part_number",
      "type": "TEXT",
      "required": true,
      "main_table": true,
      "default": null,
      "validation": null
    },
    {
      "name": "Quantity",
      "column": "quantity",
      "type": "INTEGER",
      "required": false,
      "main_table": true,
      "default": 0,
      "min": 0,
      "max": 999999
    }
  ]
  */

  -- Settings
  main_table_columns TEXT[],  -- Which fields show in table view
  category_options TEXT[],    -- If any category field exists
  enable_csv_import BOOLEAN DEFAULT true,
  enable_csv_export BOOLEAN DEFAULT true,

  -- Generated SQL (stored after generation)
  generated_sql TEXT,
  generated_typescript_types TEXT,
  generated_component_template TEXT,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting for Checkly review
    'approved',     -- Approved, ready to deploy
    'deployed',     -- SQL executed, library live
    'rejected',     -- Rejected by Checkly
    'cancelled'     -- Cancelled by user
  )),

  -- Review/Deployment Tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  deployed_at TIMESTAMPTZ,
  deployment_notes TEXT,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_library_requests_status ON library_requests(status);
CREATE INDEX idx_library_requests_company ON library_requests(company_id);
CREATE INDEX idx_library_requests_pending ON library_requests(status, created_at)
  WHERE status = 'pending';

-- RLS Policies
ALTER TABLE library_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their company's requests
CREATE POLICY "Users can view library requests from their own company"
  ON library_requests FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Users can create requests for their company
CREATE POLICY "Users can create library requests for their own company"
  ON library_requests FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) AND
    requested_by = auth.uid()
  );

-- Only admins (Checkly staff) can update status
CREATE POLICY "Admins can update library requests"
  ON library_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'Admin'
      AND company_id = (SELECT company_id FROM companies WHERE name = 'Checkly')
    )
  );
```

## Notification System Integration

### Notification Types

Add to existing notification types:

```sql
-- Update notifications table type check
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'incident','temperature','task','maintenance','digest',
    'ppm_due_soon','ppm_overdue','ppm_completed',
    'library_request_pending',    -- NEW: For Checkly admins
    'library_request_approved',   -- NEW: For users
    'library_request_deployed',   -- NEW: For users
    'library_request_rejected'    -- NEW: For users
  ));
```

### Trigger: Notify Checkly on New Request

```sql
CREATE OR REPLACE FUNCTION notify_checkly_library_request()
RETURNS TRIGGER AS $$
DECLARE
  checkly_company_id UUID;
  admin_user_ids UUID[];
BEGIN
  -- Find Checkly company ID (adjust as needed)
  SELECT id INTO checkly_company_id
  FROM companies
  WHERE name = 'Checkly'
  LIMIT 1;

  IF checkly_company_id IS NULL THEN
    RETURN NEW; -- No Checkly company found
  END IF;

  -- Get all Checkly admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_user_ids
  FROM profiles
  WHERE company_id = checkly_company_id
  AND role = 'Admin';

  -- Create notifications for each admin
  IF admin_user_ids IS NOT NULL THEN
    INSERT INTO notifications (
      company_id,
      user_id,
      type,
      title,
      message,
      severity,
      recipient_role
    )
    SELECT
      checkly_company_id,
      admin_id,
      'library_request_pending',
      'New Library Request: ' || NEW.library_name,
      NEW.description || E'\n\nRequested by: ' || (
        SELECT email FROM auth.users WHERE id = NEW.requested_by
      ) || E'\n\nClick to review.',
      'info',
      'admin'
    FROM UNNEST(admin_user_ids) AS admin_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_checkly_library_request
  AFTER INSERT ON library_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_checkly_library_request();
```

### Trigger: Notify User on Status Change

```sql
CREATE OR REPLACE FUNCTION notify_user_library_status()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  status_message TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.requested_by;

  -- Determine message based on status
  CASE NEW.status
    WHEN 'approved' THEN
      status_message := 'Your library "' || NEW.library_name || '" has been approved and will be deployed soon.';
    WHEN 'deployed' THEN
      status_message := 'Your library "' || NEW.library_name || '" is now live! You can start adding items.';
    WHEN 'rejected' THEN
      status_message := 'Your library request for "' || NEW.library_name || '" was rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'See review notes');
    ELSE
      RETURN NEW; -- No notification needed
  END CASE;

  -- Create notification
  INSERT INTO notifications (
    company_id,
    user_id,
    type,
    title,
    message,
    severity,
    recipient_role
  ) VALUES (
    NEW.company_id,
    NEW.requested_by,
    'library_request_' || NEW.status,
    'Library Request: ' || NEW.library_name,
    status_message,
    CASE NEW.status
      WHEN 'rejected' THEN 'warning'
      ELSE 'info'
    END,
    'admin' -- User's role doesn't matter for this
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_user_library_status
  AFTER UPDATE ON library_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_library_status();
```

## UI Components

### 1. User: Library Request Form

**Path**: `/dashboard/libraries/create`

- Form-based library designer
- Field builder with drag-and-drop
- SQL preview (generated client-side)
- Submit button creates request with status 'pending'

### 2. Checkly Admin: Library Requests Dashboard

**Path**: `/dashboard/admin/library-requests`

- List of all pending requests
- Filter by status, company, date
- Click to review details
- Actions: Approve, Reject, View SQL

### 3. Checkly Admin: Library Request Detail

**Path**: `/dashboard/admin/library-requests/[id]`

- Full library definition
- Generated SQL (editable)
- Actions:
  - **Approve**: Status → 'approved', generates final SQL
  - **Reject**: Status → 'rejected', requires rejection reason
  - **Deploy**: Executes SQL (via Supabase API or manual copy), Status → 'deployed'

### 4. User: My Library Requests

**Path**: `/dashboard/libraries/my-requests`

- View own requests
- Status tracking
- Link to library once deployed

## SQL Generation Engine

Client-side JavaScript/TypeScript function that:

1. Takes library definition (fields, settings)
2. Generates complete SQL migration
3. Includes: CREATE TABLE, indexes, triggers, RLS policies
4. Generates TypeScript types
5. Generates React component template

## Deployment Process

### Option A: Manual (Safer)

1. Checkly admin reviews SQL
2. Admin copies SQL to Supabase SQL Editor
3. Admin executes and verifies
4. Admin clicks "Mark as Deployed" in UI
5. User notified

### Option B: Semi-Automated (Future)

1. Checkly admin reviews SQL
2. Admin clicks "Deploy" button
3. System calls Supabase Management API (service role)
4. SQL executed via API
5. Status updated automatically
6. User notified

## Benefits

✅ **Safety**: Human review before deployment
✅ **Quality**: Checkly ensures SQL quality
✅ **User Experience**: Users don't need SQL knowledge
✅ **Flexibility**: Checkly can modify SQL before deploying
✅ **Audit Trail**: Full history of requests and deployments
✅ **Notifications**: Both sides stay informed

## Security Considerations

1. **RLS**: Users only see their company's requests
2. **Permissions**: Only Checkly admins can approve/deploy
3. **SQL Injection**: All user inputs sanitized before SQL generation
4. **Table Name Validation**: Enforce naming conventions
5. **Rate Limiting**: Prevent abuse of request system

## Future Enhancements

1. **Auto-Deployment**: If SQL passes validation, auto-deploy
2. **Template Library**: Save common patterns
3. **Version Control**: Track changes to deployed libraries
4. **Rollback**: Ability to remove libraries
5. **Analytics**: Track most requested library types
