-- =============================================
-- ROTA APPROVAL NOTIFICATIONS
-- Sends notifications when day approvals change
-- =============================================

-- Function to notify team about rota approval status
CREATE OR REPLACE FUNCTION public.notify_rota_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_rota_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_week_starting DATE;
  v_approver_name TEXT;
  v_approver_email TEXT;
  v_day_status TEXT;
  v_all_approved BOOLEAN;
  v_any_rejected BOOLEAN;
  v_pending_count INTEGER;
  v_approved_count INTEGER;
  v_rejected_count INTEGER;
  v_needs_review_count INTEGER;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_rota_creator_id UUID;
  v_rota_creator_email TEXT;
  v_rota_creator_name TEXT;
BEGIN
  -- Only process if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_rota_id := NEW.rota_id;
  
  -- Get rota details
  SELECT 
    r.company_id,
    r.site_id,
    r.week_starting,
    r.created_by
  INTO 
    v_company_id,
    v_site_id,
    v_week_starting,
    v_rota_creator_id
  FROM public.rotas r
  WHERE r.id = v_rota_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get approver info
  IF NEW.approved_by IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO 
      v_approver_name,
      v_approver_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = NEW.approved_by;
  END IF;

  -- Get approval summary for the week
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'needs_review')
  INTO 
    v_pending_count,
    v_approved_count,
    v_rejected_count,
    v_needs_review_count
  FROM public.rota_day_approvals
  WHERE rota_id = v_rota_id;

  v_all_approved := (v_pending_count = 0 AND v_rejected_count = 0 AND v_needs_review_count = 0);
  v_any_rejected := (v_rejected_count > 0);

  -- Determine notification content based on status change
  CASE NEW.status
    WHEN 'approved' THEN
      v_notification_title := 'Day Approved: ' || TO_CHAR(NEW.approval_date, 'Day, DD Mon');
      v_notification_message := 
        'Day ' || TO_CHAR(NEW.approval_date, 'DD Mon YYYY') || ' has been approved' ||
        CASE 
          WHEN v_approver_name IS NOT NULL THEN ' by ' || v_approver_name
          ELSE ''
        END || '.' ||
        CASE 
          WHEN NEW.hours_allocated > 0 THEN E'\n\nHours allocated: ' || NEW.hours_allocated || 'h'
          ELSE ''
        END ||
        CASE 
          WHEN NEW.forecasted_sales IS NOT NULL AND NEW.forecasted_sales > 0 
          THEN E'\nForecasted sales: £' || (NEW.forecasted_sales / 100)::TEXT
          ELSE ''
        END ||
        CASE 
          WHEN v_all_approved THEN E'\n\n✅ All days have been approved!'
          WHEN v_any_rejected THEN E'\n\n⚠️ Some days have been rejected and need attention.'
          ELSE E'\n\n📊 Approval progress: ' || v_approved_count || ' approved, ' || 
               v_pending_count || ' pending, ' || v_rejected_count || ' rejected'
        END;

    WHEN 'rejected' THEN
      v_notification_title := 'Day Rejected: ' || TO_CHAR(NEW.approval_date, 'Day, DD Mon');
      v_notification_message := 
        'Day ' || TO_CHAR(NEW.approval_date, 'DD Mon YYYY') || ' has been rejected' ||
        CASE 
          WHEN v_approver_name IS NOT NULL THEN ' by ' || v_approver_name
          ELSE ''
        END || '.' ||
        CASE 
          WHEN NEW.rejection_reason IS NOT NULL THEN E'\n\nReason: ' || NEW.rejection_reason
          ELSE ''
        END ||
        CASE 
          WHEN NEW.hours_allocated > 0 THEN E'\n\nHours allocated: ' || NEW.hours_allocated || 'h'
          ELSE ''
        END ||
        CASE 
          WHEN NEW.forecasted_sales IS NOT NULL AND NEW.forecasted_sales > 0 
          THEN E'\nForecasted sales: £' || (NEW.forecasted_sales / 100)::TEXT
          ELSE ''
        END ||
        E'\n\n⚠️ Please review and adjust the rota for this day.';

    WHEN 'needs_review' THEN
      v_notification_title := 'Day Needs Review: ' || TO_CHAR(NEW.approval_date, 'Day, DD Mon');
      v_notification_message := 
        'Day ' || TO_CHAR(NEW.approval_date, 'DD Mon YYYY') || ' has been marked as needing review' ||
        CASE 
          WHEN v_approver_name IS NOT NULL THEN ' by ' || v_approver_name
          ELSE ''
        END || '.' ||
        CASE 
          WHEN NEW.hours_allocated > 0 THEN E'\n\nHours allocated: ' || NEW.hours_allocated || 'h'
          ELSE ''
        END ||
        CASE 
          WHEN NEW.forecasted_sales IS NOT NULL AND NEW.forecasted_sales > 0 
          THEN E'\nForecasted sales: £' || (NEW.forecasted_sales / 100)::TEXT
          ELSE ''
        END ||
        E'\n\nPlease review the hours and forecast for this day.';

    ELSE
      RETURN NEW; -- Unknown status, skip notification
  END CASE;

  -- Get rota creator info
  IF v_rota_creator_id IS NOT NULL THEN
    SELECT 
      COALESCE(p.full_name, u.email),
      u.email
    INTO 
      v_rota_creator_name,
      v_rota_creator_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = v_rota_creator_id;
  END IF;

  -- Create notification for rota creator (if different from approver)
  IF v_rota_creator_id IS NOT NULL 
     AND (NEW.approved_by IS NULL OR v_rota_creator_id != NEW.approved_by) THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      type,
      title,
      message,
      severity,
      recipient_role
    ) VALUES (
      v_company_id,
      v_site_id,
      v_rota_creator_id,
      'rota_day_approval_' || NEW.status,
      v_notification_title,
      v_notification_message,
      CASE 
        WHEN NEW.status = 'approved' THEN 'info'
        WHEN NEW.status = 'rejected' THEN 'warning'
        WHEN NEW.status = 'needs_review' THEN 'info'
        ELSE 'info'
      END,
      NULL
    );
  END IF;

  -- Also notify all managers for the site/company about significant status changes
  IF NEW.status IN ('rejected', 'needs_review') OR v_all_approved THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      type,
      title,
      message,
      severity,
      recipient_role
    )
    SELECT 
      v_company_id,
      v_site_id,
      p.id,
      'rota_day_approval_' || NEW.status,
      v_notification_title,
      v_notification_message,
      CASE 
        WHEN NEW.status = 'approved' THEN 'info'
        WHEN NEW.status = 'rejected' THEN 'warning'
        WHEN NEW.status = 'needs_review' THEN 'info'
        ELSE 'info'
      END,
      p.app_role::TEXT
    FROM public.profiles p
    WHERE p.company_id = v_company_id
      AND (v_site_id IS NULL OR p.home_site = v_site_id)
      AND public.normalize_role(p.app_role::TEXT) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
      AND p.id != COALESCE(NEW.approved_by, '00000000-0000-0000-0000-000000000000'::UUID)
      AND p.id != COALESCE(v_rota_creator_id, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_rota_approval_status: %', SQLERRM;
    RETURN NEW;
END;
$func$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_rota_approval_status ON public.rota_day_approvals;
CREATE TRIGGER trigger_notify_rota_approval_status
  AFTER INSERT OR UPDATE OF status, approved_by, rejection_reason ON public.rota_day_approvals
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected', 'needs_review'))
  EXECUTE FUNCTION public.notify_rota_approval_status();

-- Function to notify when all days are approved
CREATE OR REPLACE FUNCTION public.notify_all_days_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_rota_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_week_starting DATE;
  v_pending_count INTEGER;
  v_rejected_count INTEGER;
  v_needs_review_count INTEGER;
  v_approved_count INTEGER;
  v_rota_creator_id UUID;
BEGIN
  v_rota_id := NEW.rota_id;
  
  -- Get rota details
  SELECT 
    r.company_id,
    r.site_id,
    r.week_starting,
    r.created_by
  INTO 
    v_company_id,
    v_site_id,
    v_week_starting,
    v_rota_creator_id
  FROM public.rotas r
  WHERE r.id = v_rota_id;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only proceed if this approval made all days approved
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Check if all days are now approved
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*) FILTER (WHERE status = 'needs_review')
  INTO 
    v_pending_count,
    v_approved_count,
    v_rejected_count,
    v_needs_review_count
  FROM public.rota_day_approvals
  WHERE rota_id = v_rota_id;

  -- If all days are approved (no pending, rejected, or needs_review), send notification
  IF v_pending_count = 0 AND v_rejected_count = 0 AND v_needs_review_count = 0 AND v_approved_count = 7 THEN
    INSERT INTO public.notifications (
      company_id,
      site_id,
      user_id,
      type,
      title,
      message,
      severity,
      recipient_role
    )
    SELECT 
      v_company_id,
      v_site_id,
      p.id,
      'rota_all_days_approved',
      '✅ All Days Approved',
      'All days for the rota week starting ' || TO_CHAR(v_week_starting, 'DD Mon YYYY') || 
      ' have been approved. The rota is ready to be published.',
      'success',
      p.app_role::TEXT
    FROM public.profiles p
    WHERE p.company_id = v_company_id
      AND (v_site_id IS NULL OR p.home_site = v_site_id)
      AND public.normalize_role(p.app_role::TEXT) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_all_days_approved: %', SQLERRM;
    RETURN NEW;
END;
$func$;

-- Create trigger for all days approved
DROP TRIGGER IF EXISTS trigger_notify_all_days_approved ON public.rota_day_approvals;
CREATE TRIGGER trigger_notify_all_days_approved
  AFTER INSERT OR UPDATE OF status ON public.rota_day_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.notify_all_days_approved();

NOTIFY pgrst, 'reload schema';

