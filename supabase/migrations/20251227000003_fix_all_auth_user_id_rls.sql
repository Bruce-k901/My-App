-- Fix all RLS policies to use id = auth.uid() instead of auth_user_id = auth.uid()
-- Staff/employees don't have auth_user_id set, they only have UUID id values
-- This migration updates all policies to work with staff profiles

DO $$
BEGIN
  
  -- =====================================================
  -- LEAVE REQUESTS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    
    -- Drop and recreate policies
    DROP POLICY IF EXISTS "view_own_leave_requests" ON leave_requests;
    CREATE POLICY "view_own_leave_requests"
    ON leave_requests FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    );

    DROP POLICY IF EXISTS "managers_view_leave_requests" ON leave_requests;
    CREATE POLICY "managers_view_leave_requests"
    ON leave_requests FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- create_own_leave_requests is already fixed in 20251227000001
    
    DROP POLICY IF EXISTS "update_own_pending_requests" ON leave_requests;
    CREATE POLICY "update_own_pending_requests"
    ON leave_requests FOR UPDATE
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      AND status = 'pending'
    );

    DROP POLICY IF EXISTS "managers_update_requests" ON leave_requests;
    CREATE POLICY "managers_update_requests"
    ON leave_requests FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed leave_requests RLS policies';
  END IF;

  -- =====================================================
  -- LEAVE BALANCES (already fixed in 20251227000002, but fixing view_own_balances if exists)
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
    DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
    CREATE POLICY "view_own_balances"
    ON leave_balances FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    );

    RAISE NOTICE 'Fixed leave_balances view_own_balances policy';
  END IF;

  -- =====================================================
  -- PUBLIC HOLIDAYS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_holidays') THEN
    DROP POLICY IF EXISTS "view_public_holidays" ON public_holidays;
    CREATE POLICY "view_public_holidays"
    ON public_holidays FOR SELECT
    USING (
      company_id IS NULL
      OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    RAISE NOTICE 'Fixed public_holidays RLS policies';
  END IF;

  -- =====================================================
  -- LEAVE BLACKOUT DATES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_blackout_dates') THEN
    DROP POLICY IF EXISTS "view_blackout_dates" ON leave_blackout_dates;
    CREATE POLICY "view_blackout_dates"
    ON leave_blackout_dates FOR SELECT
    USING (
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    DROP POLICY IF EXISTS "manage_blackout_dates" ON leave_blackout_dates;
    CREATE POLICY "manage_blackout_dates"
    ON leave_blackout_dates FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed leave_blackout_dates RLS policies';
  END IF;

  -- =====================================================
  -- TRAINING COURSES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
    DROP POLICY IF EXISTS "view_company_courses" ON training_courses;
    CREATE POLICY "view_company_courses"
    ON training_courses FOR SELECT
    USING (
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    DROP POLICY IF EXISTS "manage_courses" ON training_courses;
    CREATE POLICY "manage_courses"
    ON training_courses FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed training_courses RLS policies';
  END IF;

  -- =====================================================
  -- JOBS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    DROP POLICY IF EXISTS "view_open_jobs" ON jobs;
    CREATE POLICY "view_open_jobs"
    ON jobs FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid()
      )
      AND status = 'open'
    );

    DROP POLICY IF EXISTS "managers_view_jobs" ON jobs;
    CREATE POLICY "managers_view_jobs"
    ON jobs FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    DROP POLICY IF EXISTS "managers_manage_jobs" ON jobs;
    CREATE POLICY "managers_manage_jobs"
    ON jobs FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed jobs RLS policies';
  END IF;

  -- =====================================================
  -- PAY RATES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates') THEN
    DROP POLICY IF EXISTS "admin_view_pay_rates" ON pay_rates;
    CREATE POLICY "admin_view_pay_rates"
    ON pay_rates FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    DROP POLICY IF EXISTS "view_own_rate" ON pay_rates;
    CREATE POLICY "view_own_rate"
    ON pay_rates FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      AND is_current = true
    );

    DROP POLICY IF EXISTS "admin_manage_pay_rates" ON pay_rates;
    CREATE POLICY "admin_manage_pay_rates"
    ON pay_rates FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Fixed pay_rates RLS policies';
  END IF;

  -- =====================================================
  -- REVIEW SYSTEM TABLES
  -- =====================================================
  
  -- Company Values
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_values') THEN
    DROP POLICY IF EXISTS "view_company_values" ON company_values;
    CREATE POLICY "view_company_values" ON company_values FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_company_values" ON company_values;
    CREATE POLICY "manage_company_values" ON company_values FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Fixed company_values RLS policies';
  END IF;

  -- Scoring Scales
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scoring_scales') THEN
    DROP POLICY IF EXISTS "view_scoring_scales" ON scoring_scales;
    CREATE POLICY "view_scoring_scales" ON scoring_scales FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_scoring_scales" ON scoring_scales;
    CREATE POLICY "manage_scoring_scales" ON scoring_scales FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Fixed scoring_scales RLS policies';
  END IF;

  -- Review Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
    DROP POLICY IF EXISTS "view_review_templates" ON review_templates;
    CREATE POLICY "view_review_templates" ON review_templates FOR SELECT
    USING (
      company_id IS NULL OR 
      company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    DROP POLICY IF EXISTS "manage_review_templates" ON review_templates;
    CREATE POLICY "manage_review_templates" ON review_templates FOR ALL
    USING (
      company_id IS NULL OR
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IS NULL OR
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Fixed review_templates RLS policies';
  END IF;

  -- Employee Review Schedules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_review_schedules') THEN
    DROP POLICY IF EXISTS "view_review_schedules" ON employee_review_schedules;
    CREATE POLICY "view_review_schedules" ON employee_review_schedules FOR SELECT
    USING (
      employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    DROP POLICY IF EXISTS "manage_review_schedules" ON employee_review_schedules;
    CREATE POLICY "manage_review_schedules" ON employee_review_schedules FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed employee_review_schedules RLS policies';
  END IF;

  -- Reviews
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP POLICY IF EXISTS "view_reviews" ON reviews;
    CREATE POLICY "view_reviews" ON reviews FOR SELECT
    USING (
      employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    DROP POLICY IF EXISTS "manage_reviews" ON reviews;
    CREATE POLICY "manage_reviews" ON reviews FOR ALL
    USING (
      employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed reviews RLS policies';
  END IF;

  -- Review Responses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_responses') THEN
    DROP POLICY IF EXISTS "view_review_responses" ON review_responses;
    CREATE POLICY "view_review_responses" ON review_responses FOR SELECT
    USING (
      review_id IN (
        SELECT id FROM reviews 
        WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    );

    DROP POLICY IF EXISTS "manage_review_responses" ON review_responses;
    CREATE POLICY "manage_review_responses" ON review_responses FOR ALL
    USING (
      review_id IN (
        SELECT id FROM reviews 
        WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    )
    WITH CHECK (
      review_id IN (
        SELECT id FROM reviews 
        WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    );

    RAISE NOTICE 'Fixed review_responses RLS policies';
  END IF;

  -- Review Follow-ups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_follow_ups') THEN
    DROP POLICY IF EXISTS "view_review_follow_ups" ON review_follow_ups;
    CREATE POLICY "view_review_follow_ups" ON review_follow_ups FOR SELECT
    USING (
      assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR review_id IN (
        SELECT id FROM reviews 
        WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    );

    DROP POLICY IF EXISTS "manage_review_follow_ups" ON review_follow_ups;
    CREATE POLICY "manage_review_follow_ups" ON review_follow_ups FOR ALL
    USING (
      assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR review_id IN (
        SELECT id FROM reviews 
        WHERE manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    )
    WITH CHECK (
      assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR review_id IN (
        SELECT id FROM reviews 
        WHERE manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      )
    );

    RAISE NOTICE 'Fixed review_follow_ups RLS policies';
  END IF;

  -- Employee Review Summary
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_review_summary') THEN
    DROP POLICY IF EXISTS "view_employee_review_summary" ON employee_review_summary;
    CREATE POLICY "view_employee_review_summary" ON employee_review_summary FOR SELECT
    USING (
      employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed employee_review_summary RLS policies';
  END IF;

  -- =====================================================
  -- ATTENDANCE TABLES
  -- =====================================================
  
  -- Attendance Adjustments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_adjustments') THEN
    DROP POLICY IF EXISTS "view_company_adjustments" ON attendance_adjustments;
    CREATE POLICY "view_company_adjustments" ON attendance_adjustments FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "create_adjustments" ON attendance_adjustments;
    CREATE POLICY "create_adjustments" ON attendance_adjustments FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed attendance_adjustments RLS policies';
  END IF;

  -- Attendance Signoffs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_signoffs') THEN
    DROP POLICY IF EXISTS "view_company_signoffs" ON attendance_signoffs;
    CREATE POLICY "view_company_signoffs" ON attendance_signoffs FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_signoffs" ON attendance_signoffs;
    CREATE POLICY "manage_signoffs" ON attendance_signoffs FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed attendance_signoffs RLS policies';
  END IF;

  -- =====================================================
  -- PAYROLL TABLES
  -- =====================================================
  
  -- Payroll Submissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_submissions') THEN
    DROP POLICY IF EXISTS "view_company_payroll" ON payroll_submissions;
    CREATE POLICY "view_company_payroll" ON payroll_submissions FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_payroll" ON payroll_submissions;
    CREATE POLICY "manage_payroll" ON payroll_submissions FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed payroll_submissions RLS policies';
  END IF;

  -- Payrun Schedules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payrun_schedules') THEN
    DROP POLICY IF EXISTS "view_company_payrun_schedules" ON payrun_schedules;
    CREATE POLICY "view_company_payrun_schedules" ON payrun_schedules FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_payrun_schedules" ON payrun_schedules;
    CREATE POLICY "manage_payrun_schedules" ON payrun_schedules FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed payrun_schedules RLS policies';
  END IF;

  -- Payroll Runs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs') THEN
    DROP POLICY IF EXISTS "view_company_payroll_runs" ON payroll_runs;
    CREATE POLICY "view_company_payroll_runs" ON payroll_runs FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_payroll_runs" ON payroll_runs;
    CREATE POLICY "manage_payroll_runs" ON payroll_runs FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed payroll_runs RLS policies';
  END IF;

  -- Payroll Entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_entries') THEN
    DROP POLICY IF EXISTS "view_company_payroll_entries" ON payroll_entries;
    CREATE POLICY "view_company_payroll_entries" ON payroll_entries FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_payroll_entries" ON payroll_entries;
    CREATE POLICY "manage_payroll_entries" ON payroll_entries FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed payroll_entries RLS policies';
  END IF;

  -- Tronc Configurations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tronc_configurations') THEN
    DROP POLICY IF EXISTS "view_company_tronc" ON tronc_configurations;
    CREATE POLICY "view_company_tronc" ON tronc_configurations FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "manage_tronc" ON tronc_configurations;
    CREATE POLICY "manage_tronc" ON tronc_configurations FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed tronc_configurations RLS policies';
  END IF;

  -- =====================================================
  -- DAILY SALES NOTES (if exists)
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_sales_notes') THEN
    DROP POLICY IF EXISTS "view_company_daily_sales_notes" ON daily_sales_notes;
    CREATE POLICY "view_company_daily_sales_notes" ON daily_sales_notes FOR SELECT
    USING (
      daily_sales_id IN (
        SELECT id FROM daily_sales 
        WHERE company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid()
        )
      )
    );

    RAISE NOTICE 'Fixed daily_sales_notes RLS policies';
  END IF;

  -- =====================================================
  -- STAFF AVAILABILITY (old table, may not exist)
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability') THEN
    DROP POLICY IF EXISTS "manage_own_availability" ON staff_availability;
    CREATE POLICY "manage_own_availability"
    ON staff_availability FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    );

    DROP POLICY IF EXISTS "managers_view_availability" ON staff_availability;
    CREATE POLICY "managers_view_availability"
    ON staff_availability FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Fixed staff_availability RLS policies';
  END IF;

  -- =====================================================
  -- STAFF AVAILABILITY PATTERNS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability_patterns') THEN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "staff_manage_own_patterns" ON staff_availability_patterns;
    DROP POLICY IF EXISTS "managers_view_patterns" ON staff_availability_patterns;
    DROP POLICY IF EXISTS "staff_view_own_patterns" ON staff_availability_patterns;
    DROP POLICY IF EXISTS "staff_insert_own_patterns" ON staff_availability_patterns;
    DROP POLICY IF EXISTS "staff_update_own_patterns" ON staff_availability_patterns;
    DROP POLICY IF EXISTS "staff_delete_own_patterns" ON staff_availability_patterns;

    -- Staff can manage their own patterns
    CREATE POLICY "staff_manage_own_patterns"
    ON staff_availability_patterns FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Managers can view all patterns in their company
    CREATE POLICY "managers_view_patterns"
    ON staff_availability_patterns FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON staff_availability_patterns TO authenticated;

    RAISE NOTICE 'Fixed staff_availability_patterns RLS policies';
  END IF;

  -- =====================================================
  -- STAFF AVAILABILITY OVERRIDES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability_overrides') THEN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "staff_manage_own_overrides" ON staff_availability_overrides;
    DROP POLICY IF EXISTS "managers_view_overrides" ON staff_availability_overrides;
    DROP POLICY IF EXISTS "managers_manage_overrides" ON staff_availability_overrides;
    DROP POLICY IF EXISTS "staff_view_own_overrides" ON staff_availability_overrides;
    DROP POLICY IF EXISTS "staff_insert_own_overrides" ON staff_availability_overrides;
    DROP POLICY IF EXISTS "staff_update_own_overrides" ON staff_availability_overrides;

    -- Staff can manage their own overrides
    CREATE POLICY "staff_manage_own_overrides"
    ON staff_availability_overrides FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      AND company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Managers can view all overrides in their company
    CREATE POLICY "managers_view_overrides"
    ON staff_availability_overrides FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Managers can update overrides (e.g., approve/reject requests)
    CREATE POLICY "managers_manage_overrides"
    ON staff_availability_overrides FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON staff_availability_overrides TO authenticated;

    RAISE NOTICE 'Fixed staff_availability_overrides RLS policies';
  END IF;

  RAISE NOTICE '✅ Completed fixing all RLS policies to use id = auth.uid() instead of auth_user_id = auth.uid()';

END $$;

