-- Replace placeholder get_eho_staff_health_declarations with real implementation
-- Returns staff sickness records + RTW interview data for EHO reports

-- Must drop first because the return type signature has changed (more columns than original placeholder)
DROP FUNCTION IF EXISTS public.get_eho_staff_health_declarations(uuid, date, date);

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
  fit_for_work boolean,
  exclusion_start date,
  exclusion_end date,
  return_to_work_date date,
  medical_clearance_required boolean,
  medical_clearance_received boolean,
  food_handling_restricted boolean,
  symptomatic_in_food_areas boolean,
  rtw_conducted_date date,
  rtw_fit_for_full_duties boolean,
  rtw_gp_consulted boolean,
  rtw_adjustments_needed boolean,
  rtw_adjustments_details text,
  rtw_follow_up_required boolean,
  rtw_follow_up_date date,
  rtw_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    ssr.id AS declaration_id,
    ssr.staff_member_name AS staff_name,
    ssr.illness_onset_date AS declaration_date,
    ssr.status AS health_status,
    ssr.symptoms,
    (ssr.status != 'active') AS fit_for_work,
    ssr.exclusion_period_start AS exclusion_start,
    ssr.exclusion_period_end AS exclusion_end,
    ssr.return_to_work_date,
    ssr.medical_clearance_required,
    ssr.medical_clearance_received,
    ssr.food_handling_restricted,
    ssr.symptomatic_in_food_areas,
    ssr.rtw_conducted_date,
    ssr.rtw_fit_for_full_duties,
    ssr.rtw_gp_consulted,
    ssr.rtw_adjustments_needed,
    ssr.rtw_adjustments_details,
    ssr.rtw_follow_up_required,
    ssr.rtw_follow_up_date,
    ssr.rtw_notes
  FROM public.staff_sickness_records ssr
  WHERE ssr.site_id = p_site_id
    AND ssr.illness_onset_date >= p_start_date
    AND ssr.illness_onset_date <= p_end_date
  ORDER BY ssr.illness_onset_date DESC;
END;
$func$;
