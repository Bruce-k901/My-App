-- ============================================================================
-- Auto-Schedule 90-Day Probation Reviews
-- Description: Automatically schedules probation reviews when employee start_date is set
-- ============================================================================

-- Function to schedule probation review for an employee
CREATE OR REPLACE FUNCTION public.auto_schedule_probation_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_probation_date DATE;
  v_manager_id UUID;
  v_company_id UUID;
  v_existing_schedule UUID;
BEGIN
  -- Only proceed if start_date is being set or updated
  IF NEW.start_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get company_id from the profile
  v_company_id := NEW.company_id;
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

    -- Get the manager (reports_to)
    v_manager_id := NEW.reports_to;
    IF v_manager_id IS NULL THEN
      -- If no manager, try to find a manager in the same company
      -- Use LOWER() for case-insensitive comparison since enum values are capitalized
      SELECT id INTO v_manager_id
      FROM profiles
      WHERE company_id = v_company_id
        AND LOWER(COALESCE(app_role::text, '')) IN ('manager', 'admin', 'owner', 'general manager', 'super admin')
        AND id != NEW.id
      LIMIT 1;
    
    -- If still no manager, skip scheduling
    IF v_manager_id IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate probation end date (90 days from start_date)
  v_probation_date := NEW.start_date + INTERVAL '90 days';

  -- Find the probation review template (system template or company template)
  SELECT id INTO v_template_id
  FROM review_templates
  WHERE template_type = 'probation_review'
    AND is_active = true
    AND (
      is_system_template = true
      OR company_id = v_company_id
    )
  ORDER BY is_system_template DESC, created_at DESC
  LIMIT 1;

  -- If no template found, skip scheduling
  IF v_template_id IS NULL THEN
    RAISE NOTICE 'No probation review template found for company %', v_company_id;
    RETURN NEW;
  END IF;

  -- Check if a probation review schedule already exists for this employee
  SELECT id INTO v_existing_schedule
  FROM employee_review_schedules
  WHERE employee_id = NEW.id
    AND template_id = v_template_id
    AND status IN ('scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee');

  -- Only create if one doesn't already exist
  IF v_existing_schedule IS NULL THEN
    INSERT INTO employee_review_schedules (
      company_id,
      employee_id,
      manager_id,
      template_id,
      scheduled_date,
      due_date,
      status,
      is_recurring,
      created_by
    )
    VALUES (
      v_company_id,
      NEW.id,
      v_manager_id,
      v_template_id,
      v_probation_date,
      v_probation_date + INTERVAL '7 days', -- Due 7 days after scheduled date
      'scheduled',
      false,
      v_manager_id -- Created by the manager
    );
    
    RAISE NOTICE 'Auto-scheduled probation review for employee % on %', NEW.id, v_probation_date;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires when start_date is set or updated
DROP TRIGGER IF EXISTS trigger_auto_schedule_probation_review ON public.profiles;
CREATE TRIGGER trigger_auto_schedule_probation_review
  AFTER INSERT OR UPDATE OF start_date, reports_to, company_id
  ON public.profiles
  FOR EACH ROW
  WHEN (NEW.start_date IS NOT NULL)
  EXECUTE FUNCTION public.auto_schedule_probation_review();

-- Function to manually schedule probation reviews for existing employees
-- This can be called to backfill probation reviews for employees who already have start_date set
CREATE OR REPLACE FUNCTION public.schedule_missing_probation_reviews()
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  start_date DATE,
  probation_date DATE,
  scheduled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee RECORD;
  v_template_id UUID;
  v_probation_date DATE;
  v_manager_id UUID;
  v_existing_schedule UUID;
BEGIN
  -- Loop through employees with start_date but no probation review scheduled
  FOR v_employee IN
    SELECT 
      p.id,
      p.full_name,
      p.start_date,
      p.company_id,
      p.reports_to
    FROM profiles p
    WHERE p.start_date IS NOT NULL
      AND p.company_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM employee_review_schedules ers
        JOIN review_templates rt ON ers.template_id = rt.id
        WHERE ers.employee_id = p.id
          AND rt.template_type = 'probation_review'
          AND ers.status IN ('scheduled', 'invitation_sent', 'in_progress', 'pending_manager', 'pending_employee')
      )
  LOOP
    -- Get manager
    v_manager_id := v_employee.reports_to;
    IF v_manager_id IS NULL THEN
      -- Use LOWER() for case-insensitive comparison since enum values are capitalized
      SELECT id INTO v_manager_id
      FROM profiles
      WHERE company_id = v_employee.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN ('manager', 'admin', 'owner', 'general manager', 'super admin')
        AND id != v_employee.id
      LIMIT 1;
    END IF;

    -- Get template
    SELECT id INTO v_template_id
    FROM review_templates
    WHERE template_type = 'probation_review'
      AND is_active = true
      AND (
        is_system_template = true
        OR company_id = v_employee.company_id
      )
    ORDER BY is_system_template DESC, created_at DESC
    LIMIT 1;

    -- Calculate probation date
    v_probation_date := v_employee.start_date + INTERVAL '90 days';

    -- Schedule the review
    IF v_template_id IS NOT NULL AND v_manager_id IS NOT NULL THEN
      INSERT INTO employee_review_schedules (
        company_id,
        employee_id,
        manager_id,
        template_id,
        scheduled_date,
        due_date,
        status,
        is_recurring,
        created_by
      )
      VALUES (
        v_employee.company_id,
        v_employee.id,
        v_manager_id,
        v_template_id,
        v_probation_date,
        v_probation_date + INTERVAL '7 days',
        'scheduled',
        false,
        v_manager_id
      );

      scheduled := true;
    ELSE
      scheduled := false;
    END IF;

    -- Return result
    employee_id := v_employee.id;
    employee_name := v_employee.full_name;
    start_date := v_employee.start_date;
    probation_date := v_probation_date;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auto_schedule_probation_review() TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_missing_probation_reviews() TO authenticated;

COMMENT ON FUNCTION public.auto_schedule_probation_review() IS 
  'Automatically schedules a 90-day probation review when an employee start_date is set or updated';

COMMENT ON FUNCTION public.schedule_missing_probation_reviews() IS 
  'Manually schedules probation reviews for existing employees who have start_date but no scheduled review';

