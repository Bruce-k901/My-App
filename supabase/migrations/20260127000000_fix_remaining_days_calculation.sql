-- Fix remaining_days calculation to use accrued_days instead of entitled_days
-- remaining_days should match available_days (accrued + carried_over + adjustments - taken - pending)

-- Fix get_leave_balances_peoplely function
DROP FUNCTION IF EXISTS public.get_leave_balances_peoplely(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_leave_balances_peoplely(
  p_company_id uuid,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  site_id uuid,
  start_date date,
  contract_type text,
  app_role text,
  employee_type text,
  leave_type_id uuid,
  leave_type_name text,
  leave_type_code text,
  leave_type_color text,
  year integer,
  entitled_days numeric,
  carried_over numeric,
  adjustments numeric,
  taken_days numeric,
  pending_days numeric,
  remaining_days numeric,
  average_hours_13_weeks numeric,
  calculated_entitlement numeric,
  accrued_days numeric,
  available_days numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_month integer;
  v_day integer;
  v_hy_start date;
  v_hy_end date;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;

  -- Holiday year start (defaults to Jan 1 if not set)
  SELECT
    COALESCE(c.holiday_year_start_month, 1),
    COALESCE(c.holiday_year_start_day, 1)
  INTO v_month, v_day
  FROM public.companies c
  WHERE c.id = p_company_id
  LIMIT 1;

  -- Compute current holiday year boundaries relative to *today*
  v_hy_start := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, v_month, v_day);
  IF CURRENT_DATE < v_hy_start THEN
    v_hy_start := (v_hy_start - INTERVAL '1 year')::date;
  END IF;
  v_hy_end := (v_hy_start + INTERVAL '1 year - 1 day')::date;

  RETURN QUERY
  WITH company_profiles AS (
    SELECT
      p.profile_id,
      p.full_name,
      p.email,
      p.home_site AS site_id,
      p.start_date,
      p.contract_type,
      p.app_role
    FROM public.get_company_profiles(p_company_id) p
  ),
  avg_hours AS (
    SELECT
      sa.profile_id::uuid AS profile_id,
      (COALESCE(SUM(sa.total_hours), 0) / 13.0)::numeric AS avg_weekly_hours_13w
    FROM public.staff_attendance sa
    WHERE sa.company_id = p_company_id
      AND sa.clock_in_time >= (CURRENT_DATE - INTERVAL '13 weeks')
      AND sa.clock_out_time IS NOT NULL
    GROUP BY sa.profile_id
  ),
  base AS (
    SELECT
      lb.id,
      lb.company_id,
      lb.profile_id,
      cp.full_name,
      cp.email,
      cp.site_id,
      cp.start_date,
      cp.contract_type,
      cp.app_role,
      lb.leave_type_id,
      lt.name AS leave_type_name,
      lt.code AS leave_type_code,
      lt.color AS leave_type_color,
      lb.year,
      COALESCE(lb.entitled_days, 0)::numeric AS entitled_days,
      COALESCE(lb.carried_over, 0)::numeric AS carried_over,
      COALESCE(lb.adjustments, 0)::numeric AS adjustments,
      COALESCE(lb.taken_days, 0)::numeric AS taken_days,
      COALESCE(lb.pending_days, 0)::numeric AS pending_days,
      COALESCE(ah.avg_weekly_hours_13w, 0)::numeric AS average_hours_13_weeks
    FROM public.leave_balances lb
    JOIN company_profiles cp ON cp.profile_id = lb.profile_id
    LEFT JOIN public.leave_types lt ON lt.id = lb.leave_type_id
    LEFT JOIN avg_hours ah ON ah.profile_id = lb.profile_id
    WHERE lb.company_id = p_company_id
      AND lb.year = p_year
  ),
  calculated AS (
    SELECT
      b.*,
      -- calculated entitlement (days):
      -- Salaried: 28 days (Owner/Admin/Manager). Hourly: pro-rata vs a 40hr week using avg hours.
      CASE
        WHEN lower(COALESCE(b.app_role, '')) IN ('owner', 'admin', 'manager') THEN 28::numeric
        WHEN b.average_hours_13_weeks > 0 THEN ROUND((28.0 * (b.average_hours_13_weeks / 40.0))::numeric, 2)
        ELSE b.entitled_days
      END AS calculated_entitlement,
      -- accrued_days: pro-rata from holiday year start (or employment start) to today
      CASE
        WHEN CURRENT_DATE < v_hy_start THEN 0::numeric
        ELSE
          ROUND(
            (
              CASE
                WHEN lower(COALESCE(b.app_role, '')) IN ('owner', 'admin', 'manager') THEN 28::numeric
                WHEN b.average_hours_13_weeks > 0 THEN (28.0 * (b.average_hours_13_weeks / 40.0))::numeric
                ELSE b.entitled_days
              END
            )
            * GREATEST(
                0::numeric,
                LEAST(1::numeric,
                  ((CURRENT_DATE - GREATEST(COALESCE(b.start_date, v_hy_start), v_hy_start))::numeric
                    / NULLIF((v_hy_end - v_hy_start)::numeric, 0::numeric)
                  )
                )
              ),
            2
          )
      END AS accrued_days
    FROM base b
  )
  SELECT
    c.id,
    c.company_id,
    c.profile_id,
    COALESCE(c.full_name, 'Unknown')::text,
    c.email,
    c.site_id,
    c.start_date,
    c.contract_type,
    c.app_role,
    CASE
      -- Rule requested: managers and up are salaried staff
      WHEN lower(COALESCE(c.app_role, '')) IN ('owner', 'admin', 'manager') THEN 'salaried'
      ELSE 'hourly'
    END AS employee_type,
    c.leave_type_id,
    COALESCE(c.leave_type_name, 'Annual Leave')::text,
    COALESCE(c.leave_type_code, 'ANNUAL')::text,
    COALESCE(c.leave_type_color, '#6B7280')::text,
    c.year,
    c.entitled_days,
    c.carried_over,
    c.adjustments,
    c.taken_days,
    c.pending_days,
    -- remaining_days: same as available_days (accrued + carried_over + adjustments - taken - pending)
    (
      c.accrued_days
      + c.carried_over + c.adjustments - c.taken_days - c.pending_days
    ) AS remaining_days,
    c.average_hours_13_weeks,
    c.calculated_entitlement,
    c.accrued_days,
    -- available_days: accrued + carried_over + adjustments - taken - pending
    (
      c.accrued_days
      + c.carried_over + c.adjustments - c.taken_days - c.pending_days
    ) AS available_days
  FROM calculated c
  ORDER BY COALESCE(c.full_name, '') ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leave_balances_peoplely(uuid, integer) TO authenticated;

-- Fix leave_balances_view to use accrued calculation
-- Note: This view may need to use a function for accrued calculation, but for now we'll use a simpler approach
-- that matches the logic from the RPC function
DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Recreate leave_balances_view with corrected remaining_days calculation
    -- Use calculate_available_holiday_days function which correctly calculates: accrued + carried_over + adjustments - taken - pending
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
      -- remaining_days: Use the same calculation as available_days (accrued + carried_over + adjustments - taken - pending)
      COALESCE(calculate_available_holiday_days(lb.profile_id, lb.leave_type_id, lb.year), 0) as remaining_days,
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
END $$;
