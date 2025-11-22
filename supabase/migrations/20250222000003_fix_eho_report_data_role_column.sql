-- ============================================================================
-- Migration: Fix get_eho_report_data to use app_role instead of role
-- Description: The profiles table uses app_role, not role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_eho_report_data(
  p_site_id uuid,
  p_start_date date,
  p_end_date date,
  p_template_categories text[] default null
)
RETURNS TABLE (
  completion_id uuid,
  task_id uuid,
  template_id uuid,
  template_name text,
  template_category text,
  template_slug text,
  completed_at timestamptz,
  completed_by_name text,
  completed_by_role text,
  due_date date,
  due_time time,
  daypart text,
  completion_data jsonb,
  evidence_attachments text[],
  flagged boolean,
  flag_reason text,
  duration_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tcr.id AS completion_id,
    tcr.task_id,
    tcr.template_id,
    tt.name AS template_name,
    tt.category AS template_category,
    tt.slug AS template_slug,
    tcr.completed_at,
    p.full_name AS completed_by_name,
    COALESCE(p.app_role, p.role)::text AS completed_by_role, -- Use app_role, fallback to role
    ct.due_date,
    ct.due_time,
    ct.daypart,
    tcr.completion_data,
    tcr.evidence_attachments,
    tcr.flagged,
    tcr.flag_reason,
    tcr.duration_seconds
  FROM public.task_completion_records tcr
  INNER JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
  LEFT JOIN public.task_templates tt ON tt.id = tcr.template_id
  LEFT JOIN public.profiles p ON p.id = tcr.completed_by OR p.auth_user_id = tcr.completed_by
  WHERE tcr.site_id = p_site_id
    AND tcr.completed_at::date >= p_start_date
    AND tcr.completed_at::date <= p_end_date
    AND (p_template_categories IS NULL OR tt.category = ANY(p_template_categories))
    AND (
      -- RLS check: user has access to this site
      public.is_service_role()
      OR public.has_site_access(p_site_id)
    )
  ORDER BY tcr.completed_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_eho_report_data(uuid, date, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_eho_report_data(uuid, date, date, text[]) TO service_role;

