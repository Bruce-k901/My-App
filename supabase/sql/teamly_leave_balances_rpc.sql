-- Peoplely Leave Balances (Pragmatic, non-recursive) RPCs
--
-- Why this exists:
-- - `profiles` RLS has been a source of recursion / 500s via PostgREST.
-- - The frontend should NOT need to query `profiles` directly for this page.
-- - We already have a SECURITY DEFINER RPC `get_company_profiles(company_id)` that bypasses RLS.
--
-- This file adds:
-- 1) `ensure_leave_balances_for_company(company_id, year)`:
--    Creates missing leave_balances rows for all company profiles for the given year.
-- 2) `get_leave_balances_peoplely(company_id, year)`:
--    Returns balances joined to company profiles + leave types, plus computed fields:
--    - average_hours_13_weeks (from staff_attendance.total_hours)
--    - calculated_entitlement (days)
--    - accrued_days / available_days (days)
--
-- NOTE: Apply this in the Supabase SQL editor (or migration) once.

-- ----------------------------------------------------------------------------
-- 1) Ensure balances exist for all employees in company
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_leave_balances_for_company(
  p_company_id uuid,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE (
  inserted_count integer,
  year integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leave_type_id uuid;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN QUERY SELECT 0, p_year;
    RETURN;
  END IF;

  -- Pick a reasonable default leave type for Annual Leave
  SELECT lt.id
  INTO v_leave_type_id
  FROM public.leave_types lt
  WHERE (lt.company_id IS NULL OR lt.company_id = p_company_id)
    AND (
      lower(coalesce(lt.code, '')) IN ('annual_leave', 'annual', 'holiday')
      OR lower(coalesce(lt.name, '')) LIKE '%annual%'
      OR lower(coalesce(lt.name, '')) LIKE '%holiday%'
    )
  ORDER BY
    CASE WHEN lt.company_id = p_company_id THEN 0 ELSE 1 END,
    lt.created_at NULLS LAST
  LIMIT 1;

  IF v_leave_type_id IS NULL THEN
    -- If we can't find a default leave type, do nothing.
    RETURN QUERY SELECT 0, p_year;
    RETURN;
  END IF;

  WITH company_profiles AS (
    -- This RPC must already exist. It bypasses RLS and returns all profiles in the company.
    SELECT profile_id
    FROM public.get_company_profiles(p_company_id)
  ),
  inserted AS (
    INSERT INTO public.leave_balances (
      company_id,
      profile_id,
      leave_type_id,
      year,
      entitled_days,
      carried_over,
      adjustments,
      taken_days,
      pending_days
    )
    SELECT
      p_company_id,
      cp.profile_id,
      v_leave_type_id,
      p_year,
      0, 0, 0, 0, 0
    FROM company_profiles cp
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.leave_balances lb
      WHERE lb.company_id = p_company_id
        AND lb.profile_id = cp.profile_id
        AND lb.year = p_year
        AND lb.leave_type_id = v_leave_type_id
    )
    RETURNING 1
  )
  SELECT COUNT(*)::integer, p_year
  INTO inserted_count, year
  FROM inserted;

  RETURN QUERY SELECT COALESCE(inserted_count, 0), p_year;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_leave_balances_for_company(uuid, integer) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) Balances RPC for the balances page (no client-side joins)
-- ----------------------------------------------------------------------------
-- IMPORTANT:
-- If we add/remove/rename OUT columns, Postgres requires dropping the function first.
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
      sa.user_id::uuid AS profile_id,
      (COALESCE(SUM(sa.total_hours), 0) / 13.0)::numeric AS avg_weekly_hours_13w
    FROM public.staff_attendance sa
    WHERE sa.company_id = p_company_id
      AND sa.clock_in_time >= (CURRENT_DATE - INTERVAL '13 weeks')
      AND sa.clock_out_time IS NOT NULL
    GROUP BY sa.user_id
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
  )
  SELECT
    b.id,
    b.company_id,
    b.profile_id,
    COALESCE(b.full_name, 'Unknown')::text,
    b.email,
    b.site_id,
    b.start_date,
    b.contract_type,
    b.app_role,
    CASE
      -- Rule requested: managers and up are salaried staff
      WHEN lower(COALESCE(b.app_role, '')) IN ('owner', 'admin', 'manager') THEN 'salaried'
      ELSE 'hourly'
    END AS employee_type,
    b.leave_type_id,
    COALESCE(b.leave_type_name, 'Annual Leave')::text,
    COALESCE(b.leave_type_code, 'ANNUAL')::text,
    COALESCE(b.leave_type_color, '#6B7280')::text,
    b.year,
    b.entitled_days,
    b.carried_over,
    b.adjustments,
    b.taken_days,
    b.pending_days,
    (b.entitled_days + b.carried_over + b.adjustments - b.taken_days - b.pending_days) AS remaining_days,
    b.average_hours_13_weeks,
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
    END AS accrued_days,
    -- available_days: accrued + carried_over + adjustments - taken - pending
    (
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
      END
      + b.carried_over + b.adjustments - b.taken_days - b.pending_days
    ) AS available_days
  FROM base b
  ORDER BY COALESCE(b.full_name, '') ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leave_balances_peoplely(uuid, integer) TO authenticated;


