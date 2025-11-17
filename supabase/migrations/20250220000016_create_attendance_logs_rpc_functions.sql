-- ============================================================================
-- Migration: Create RPC Functions for attendance_logs Date Filtering
-- Description: Creates RPC functions to handle date filtering that REST API
--              can't do directly (due to ::date casting limitation)
-- ============================================================================

BEGIN;

-- Function to get attendance logs for a specific date and site
-- This replaces the REST API query that uses clock_in_at::date
CREATE OR REPLACE FUNCTION public.get_attendance_logs_by_date(
  p_site_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  site_id UUID,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  location JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.company_id,
    al.site_id,
    al.clock_in_at,
    al.clock_out_at,
    al.location,
    al.notes,
    al.created_at,
    al.updated_at
  FROM public.attendance_logs al
  WHERE al.clock_in_at >= p_date
    AND al.clock_in_at < p_date + INTERVAL '1 day'
    AND (p_site_id IS NULL OR al.site_id = p_site_id)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.id = al.user_id -- Own records
        OR (
          p.company_id = al.company_id
          AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
        ) -- Company managers
      )
    )
  ORDER BY al.clock_in_at DESC;
END;
$$;

-- Function to check if user is clocked in today (for a specific site)
-- This replaces queries using clock_in_at::date
CREATE OR REPLACE FUNCTION public.is_user_clocked_in_today(
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_clocked_in BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_logs al
    WHERE al.user_id = p_user_id
      AND al.clock_in_at >= p_date
      AND al.clock_in_at < p_date + INTERVAL '1 day'
      AND al.clock_out_at IS NULL
      AND (p_site_id IS NULL OR al.site_id = p_site_id)
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

-- Function to get active attendance logs for a site (today, not clocked out)
CREATE OR REPLACE FUNCTION public.get_active_attendance_logs(
  p_site_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  clock_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.clock_in_at
  FROM public.attendance_logs al
  WHERE al.site_id = p_site_id
    AND al.clock_in_at >= p_date
    AND al.clock_in_at < p_date + INTERVAL '1 day'
    AND al.clock_out_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = al.company_id
    )
  ORDER BY al.clock_in_at DESC;
END;
$$;

COMMIT;

-- Note: These RPC functions can be called via REST API like:
-- POST /rest/v1/rpc/get_attendance_logs_by_date
-- Body: {"p_site_id": "...", "p_date": "2025-11-17"}
-- This avoids the ::date casting issue in URL filters.

