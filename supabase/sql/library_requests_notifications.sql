-- ============================================
-- Library Requests Notification Triggers
-- ============================================
-- Handles automatic notifications for library request workflow

-- Step 1: Update notification types to include library request types
DO $$
BEGIN
  -- Check if constraint exists and update it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'notifications' 
    AND constraint_name = 'notifications_type_check'
  ) THEN
    -- Drop old constraint
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  -- Add new constraint with library request types
  ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'incident','temperature','task','maintenance','digest',
    'ppm_due_soon','ppm_overdue','ppm_completed',
    'library_request_pending',
    'library_request_approved',
    'library_request_deployed',
    'library_request_rejected'
  ));
  
  RAISE NOTICE 'Notification types updated to include library request types.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating notification types: %', SQLERRM;
END $$;

-- Step 2: Function to notify Checkly admins of new requests
CREATE OR REPLACE FUNCTION notify_checkly_library_request()
RETURNS TRIGGER AS $$
DECLARE
  checkly_company_id UUID;
  admin_user_ids UUID[];
  requester_email TEXT;
  requester_name TEXT;
BEGIN
  -- Only process if status is pending
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Find Checkly company ID (adjust company name as needed)
  SELECT id INTO checkly_company_id 
  FROM companies 
  WHERE name ILIKE '%checkly%' OR name ILIKE '%checkly app%'
  LIMIT 1;
  
  IF checkly_company_id IS NULL THEN
    RAISE NOTICE 'Checkly company not found. Skipping notification.';
    RETURN NEW;
  END IF;
  
  -- Get requester info
  SELECT email, COALESCE(full_name, email) INTO requester_email, requester_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = NEW.requested_by;
  
  -- Get all Checkly admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_user_ids
  FROM profiles
  WHERE company_id = checkly_company_id
  AND LOWER(app_role::text) IN ('owner', 'admin');
  
  -- Create notifications for each admin
  IF admin_user_ids IS NOT NULL AND array_length(admin_user_ids, 1) > 0 THEN
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
      COALESCE(NEW.description, 'No description provided') || E'\n\n' ||
      'Requested by: ' || COALESCE(requester_name, requester_email) || 
      ' (' || (SELECT name FROM companies WHERE id = NEW.company_id) || ')' ||
      E'\n\n' ||
      'Table: ' || NEW.table_name ||
      E'\n\n' ||
      'Click to review in Admin Dashboard.',
      'info',
      'admin'
    FROM UNNEST(admin_user_ids) AS admin_id;
    
    RAISE NOTICE 'Notifications sent to % Checkly admins for library request %', 
      array_length(admin_user_ids, 1), NEW.id;
  ELSE
    RAISE NOTICE 'No Checkly admin users found. Skipping notification.';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_checkly_library_request: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Function to notify users of status changes
CREATE OR REPLACE FUNCTION notify_user_library_status()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  company_name TEXT;
  status_message TEXT;
  notification_severity TEXT;
BEGIN
  -- Only notify on status changes (not on initial insert)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Don't notify on pending status (that's handled by other trigger)
  IF NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Get user info
  SELECT u.email, COALESCE(p.full_name, u.email) INTO user_email, user_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = NEW.requested_by;
  
  -- Get company name
  SELECT name INTO company_name
  FROM companies
  WHERE id = NEW.company_id;
  
  -- Determine message and severity based on status
  CASE NEW.status
    WHEN 'approved' THEN
      status_message := 'Your library request "' || NEW.library_name || '" has been approved by Checkly. ' ||
                       'It will be deployed soon, and you will receive another notification when it''s ready to use.';
      notification_severity := 'info';
    WHEN 'deployed' THEN
      status_message := 'Your library "' || NEW.library_name || '" is now live! ' ||
                       'You can start adding items and using it in your workflows.';
      notification_severity := 'info';
    WHEN 'rejected' THEN
      status_message := 'Your library request for "' || NEW.library_name || '" was rejected by Checkly.';
      IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason != '' THEN
        status_message := status_message || E'\n\nReason: ' || NEW.rejection_reason;
      END IF;
      IF NEW.review_notes IS NOT NULL AND NEW.review_notes != '' THEN
        status_message := status_message || E'\n\nNotes: ' || NEW.review_notes;
      END IF;
      notification_severity := 'warning';
    WHEN 'cancelled' THEN
      -- Don't notify on cancellation (user initiated)
      RETURN NEW;
    ELSE
      RETURN NEW; -- Unknown status, skip notification
  END CASE;
  
  -- Create notification for the user
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
    notification_severity,
    NULL  -- User's role, doesn't matter for this
  );
  
  RAISE NOTICE 'User notification sent for library request % (status: %)', NEW.id, NEW.status;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_user_library_status: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers
DROP TRIGGER IF EXISTS trigger_notify_checkly_library_request ON library_requests;
CREATE TRIGGER trigger_notify_checkly_library_request
  AFTER INSERT ON library_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_checkly_library_request();

DROP TRIGGER IF EXISTS trigger_notify_user_library_status ON library_requests;
CREATE TRIGGER trigger_notify_user_library_status
  AFTER UPDATE ON library_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_user_library_status();

-- Comments
COMMENT ON FUNCTION notify_checkly_library_request() IS 'Sends notifications to Checkly admins when a new library request is submitted';
COMMENT ON FUNCTION notify_user_library_status() IS 'Sends notifications to users when their library request status changes';

