-- =====================================================
-- LEAVE VIEWS FOR EASIER QUERYING
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Leave balances with calculated remaining
    CREATE OR REPLACE VIEW leave_balances_view AS
    SELECT 
      lb.id,
      lb.company_id,
      lb.profile_id,
      lb.leave_type_id,
      lb.year,
      lb.entitled_days,
      lb.carried_over,
      lb.adjustments,
      lb.taken_days,
      lb.pending_days,
      (lb.entitled_days + lb.carried_over + lb.adjustments - lb.taken_days - lb.pending_days) as remaining_days,
      lt.name as leave_type_name,
      lt.code as leave_type_code,
      lt.color as leave_type_color,
      lt.deducts_from_allowance,
      p.full_name,
      p.email
    FROM leave_balances lb
    JOIN leave_types lt ON lt.id = lb.leave_type_id
    JOIN profiles p ON p.id = lb.profile_id;

    -- Grant access
    GRANT SELECT ON leave_balances_view TO authenticated;

  END IF;

  -- Only create leave_requests_view if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Leave requests with details
    CREATE OR REPLACE VIEW leave_requests_view AS
    SELECT 
      lr.id,
      lr.company_id,
      lr.profile_id,
      lr.leave_type_id,
      lr.start_date,
      lr.end_date,
      lr.start_half_day,
      lr.end_half_day,
      lr.total_days,
      lr.status,
      lr.reason,
      lr.requested_at,
      lr.reviewed_by,
      lr.reviewed_at,
      lr.decline_reason,
      lr.employee_notes,
      lr.manager_notes,
      lt.name as leave_type_name,
      lt.code as leave_type_code,
      lt.color as leave_type_color,
      p.full_name as employee_name,
      p.email as employee_email,
      p.avatar_url as employee_avatar,
      p.site_id as home_site,
      reviewer.full_name as reviewer_name
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    JOIN profiles p ON p.id = lr.profile_id
    LEFT JOIN profiles reviewer ON reviewer.id = lr.reviewed_by;

    -- Grant access
    GRANT SELECT ON leave_requests_view TO authenticated;

    -- Only create leave_calendar_view if sites table also exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      -- Team calendar view
      CREATE OR REPLACE VIEW leave_calendar_view AS
      SELECT 
        lr.id,
        lr.company_id,
        lr.profile_id,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.status,
        lt.name as leave_type_name,
        lt.color,
        p.full_name,
        p.avatar_url,
        p.site_id as home_site,
        s.name as site_name
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
      JOIN profiles p ON p.id = lr.profile_id
      LEFT JOIN sites s ON s.id = p.site_id
      WHERE lr.status IN ('approved', 'taken');

      -- Grant access
      GRANT SELECT ON leave_calendar_view TO authenticated;
    END IF;

  END IF;

  RAISE NOTICE 'Created leave views';

END $$;

