-- ============================================================================
-- Migration: 20251111152000_create_eho_extended_data_functions.sql
-- Description: Extended data functions for comprehensive EHO reports
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Function: Get Training Records
    CREATE OR REPLACE FUNCTION public.get_eho_training_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      staff_id uuid,
      staff_name text,
      training_type text,
      completed_at timestamptz,
      expiry_date date,
      certificate_number text,
      provider text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        p.id AS staff_id,
        p.full_name AS staff_name,
        tc.certificate_type AS training_type,
        tc.completed_at,
        tc.expiry_date,
        tc.certificate_number,
        tc.provider
      FROM public.profiles p
      INNER JOIN public.training_certificates tc ON tc.profile_id = p.id
      INNER JOIN public.user_site_access usa ON usa.auth_user_id = p.auth_user_id
      WHERE usa.site_id = p_site_id
        AND tc.completed_at::date >= p_start_date
        AND tc.completed_at::date <= p_end_date
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY p.full_name, tc.completed_at DESC;
    END;
    $func$;

    -- Function: Get Temperature Records
    CREATE OR REPLACE FUNCTION public.get_eho_temperature_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      recorded_at timestamptz,
      asset_name text,
      asset_type text,
      reading numeric,
      unit text,
      status text,
      recorded_by_name text,
      evaluation jsonb
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        tl.recorded_at,
        a.name AS asset_name,
        a.asset_type,
        tl.reading,
        tl.unit,
        tl.status,
        p.full_name AS recorded_by_name,
        tl.meta->'evaluation' AS evaluation
      FROM public.temperature_logs tl
      LEFT JOIN public.assets a ON a.id = tl.asset_id
      LEFT JOIN public.profiles p ON p.id = tl.recorded_by
      WHERE tl.site_id = p_site_id
        AND tl.recorded_at::date >= p_start_date
        AND tl.recorded_at::date <= p_end_date
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY tl.recorded_at DESC;
    END;
    $func$;

    -- Function: Get Incident Reports
    CREATE OR REPLACE FUNCTION public.get_eho_incident_reports(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      incident_id uuid,
      incident_type text,
      occurred_at timestamptz,
      reported_by_name text,
      description text,
      severity text,
      riddor_category text,
      status text,
      follow_up_actions text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        i.id AS incident_id,
        i.incident_type,
        i.occurred_at,
        p.full_name AS reported_by_name,
        i.description,
        i.severity,
        i.riddor_category,
        i.status,
        i.follow_up_actions
      FROM public.incidents i
      LEFT JOIN public.profiles p ON p.id = i.reported_by
      WHERE i.site_id = p_site_id
        AND i.occurred_at::date >= p_start_date
        AND i.occurred_at::date <= p_end_date
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY i.occurred_at DESC;
    END;
    $func$;

    -- Function: Get Cleaning Schedules (from task completions with cleaning category)
    CREATE OR REPLACE FUNCTION public.get_eho_cleaning_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      completion_id uuid,
      template_name text,
      completed_at timestamptz,
      completed_by_name text,
      completion_data jsonb,
      due_date date,
      daypart text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        tcr.id AS completion_id,
        tt.name AS template_name,
        tcr.completed_at,
        p.full_name AS completed_by_name,
        tcr.completion_data,
        ct.due_date,
        ct.daypart
      FROM public.task_completion_records tcr
      INNER JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
      LEFT JOIN public.task_templates tt ON tt.id = tcr.template_id
      LEFT JOIN public.profiles p ON p.id = tcr.completed_by
      WHERE tcr.site_id = p_site_id
        AND tcr.completed_at::date >= p_start_date
        AND tcr.completed_at::date <= p_end_date
        AND tt.category = 'cleaning'
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY tcr.completed_at DESC;
    END;
    $func$;

    -- Function: Get Pest Control Records (from task completions with pest control template)
    CREATE OR REPLACE FUNCTION public.get_eho_pest_control_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      completion_id uuid,
      completed_at timestamptz,
      completed_by_name text,
      assessment_result text,
      findings text,
      actions_taken text,
      completion_data jsonb
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        tcr.id AS completion_id,
        tcr.completed_at,
        p.full_name AS completed_by_name,
        tcr.completion_data->>'overall_assessment' AS assessment_result,
        tcr.completion_data->>'notes' AS findings,
        tcr.completion_data->>'corrective_actions' AS actions_taken,
        tcr.completion_data
      FROM public.task_completion_records tcr
      INNER JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
      LEFT JOIN public.task_templates tt ON tt.id = tcr.template_id
      LEFT JOIN public.profiles p ON p.id = tcr.completed_by
      WHERE tcr.site_id = p_site_id
        AND tcr.completed_at::date >= p_start_date
        AND tcr.completed_at::date <= p_end_date
        AND (tt.slug = 'weekly_pest_control_inspection' OR tt.category = 'food_safety' AND tt.name ILIKE '%pest%')
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY tcr.completed_at DESC;
    END;
    $func$;

    -- Function: Get Opening/Closing Checklists
    CREATE OR REPLACE FUNCTION public.get_eho_opening_closing_checklists(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      completion_id uuid,
      checklist_type text,
      completed_at timestamptz,
      completed_by_name text,
      completion_data jsonb,
      daypart text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT
        tcr.id AS completion_id,
        CASE
          WHEN ct.daypart = 'before_open' THEN 'Opening Checklist'
          WHEN ct.daypart = 'after_service' THEN 'Closing Checklist'
          ELSE 'Other'
        END AS checklist_type,
        tcr.completed_at,
        p.full_name AS completed_by_name,
        tcr.completion_data,
        ct.daypart
      FROM public.task_completion_records tcr
      INNER JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
      LEFT JOIN public.profiles p ON p.id = tcr.completed_by
      WHERE tcr.site_id = p_site_id
        AND tcr.completed_at::date >= p_start_date
        AND tcr.completed_at::date <= p_end_date
        AND ct.daypart IN ('before_open', 'after_service')
        AND (
          public.has_site_access(p_site_id)
          OR public.is_service_role()
        )
      ORDER BY tcr.completed_at DESC;
    END;
    $func$;

    -- Function: Get Supplier/Delivery Records (placeholder - to be implemented when supplier system is built)
    CREATE OR REPLACE FUNCTION public.get_eho_supplier_delivery_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      delivery_id uuid,
      supplier_name text,
      delivery_date date,
      received_by_name text,
      items_received text,
      temperature_check text,
      condition_check text
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Placeholder: Returns empty result set
      -- TODO: Implement when supplier/delivery system is built
      RETURN QUERY
      SELECT
        NULL::uuid AS delivery_id,
        NULL::text AS supplier_name,
        NULL::date AS delivery_date,
        NULL::text AS received_by_name,
        NULL::text AS items_received,
        NULL::text AS temperature_check,
        NULL::text AS condition_check
      WHERE false; -- Always returns no rows
    END;
    $func$;

    -- Function: Get Maintenance Logs (placeholder - check if maintenance_logs table exists)
    CREATE OR REPLACE FUNCTION public.get_eho_maintenance_logs(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      maintenance_id uuid,
      asset_name text,
      maintenance_type text,
      completed_at timestamptz,
      completed_by_name text,
      description text,
      next_due_date date
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Check if maintenance_logs table exists, otherwise return empty
      -- TODO: Implement when maintenance_logs table is created
      RETURN QUERY
      SELECT
        NULL::uuid AS maintenance_id,
        NULL::text AS asset_name,
        NULL::text AS maintenance_type,
        NULL::timestamptz AS completed_at,
        NULL::text AS completed_by_name,
        NULL::text AS description,
        NULL::date AS next_due_date
      WHERE false; -- Always returns no rows
    END;
    $func$;

    -- Function: Get Staff Health Declarations (placeholder - to be implemented)
    CREATE OR REPLACE FUNCTION public.get_eho_staff_health_declarations(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
    RETURNS TABLE (
      declaration_id uuid,
      staff_name text,
      declaration_date date,
      health_status text,
      symptoms text,
      fit_for_work boolean
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Placeholder: Returns empty result set
      -- TODO: Implement when staff health declaration system is built
      RETURN QUERY
      SELECT
        NULL::uuid AS declaration_id,
        NULL::text AS staff_name,
        NULL::date AS declaration_date,
        NULL::text AS health_status,
        NULL::text AS symptoms,
        NULL::boolean AS fit_for_work
      WHERE false; -- Always returns no rows
    END;
    $func$;

    -- Function: Get Allergen Information (placeholder - to be implemented)
    CREATE OR REPLACE FUNCTION public.get_eho_allergen_information(
  p_site_id uuid
)
    RETURNS TABLE (
      allergen_name text,
      present_in_items text[],
      procedures text,
      last_updated timestamptz
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      -- Placeholder: Returns empty result set
      -- TODO: Implement when allergen management system is built
      RETURN QUERY
      SELECT
        NULL::text AS allergen_name,
        NULL::text[] AS present_in_items,
        NULL::text AS procedures,
        NULL::timestamptz AS last_updated
      WHERE false; -- Always returns no rows
    END;
    $func$;

    -- Grant execute permissions
    GRANT EXECUTE ON FUNCTION public.get_eho_training_records(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_temperature_records(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_incident_reports(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_cleaning_records(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_pest_control_records(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_opening_closing_checklists(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_supplier_delivery_records(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_maintenance_logs(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_staff_health_declarations(uuid, date, date) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_eho_allergen_information(uuid) TO authenticated;

    RAISE NOTICE 'Created EHO extended data functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles) do not exist yet - skipping EHO functions';
  END IF;
END $$;

