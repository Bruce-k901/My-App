-- Create incidents view to match frontend expectations
-- This view provides the expected field names and structure for the frontend

DROP VIEW IF EXISTS public.incidents_view;

CREATE VIEW public.incidents_view AS
SELECT 
    id,
    company_id,
    site_id,
    reported_by AS user_id,
    created_at AS incident_date,
    description,
    NULL AS action_taken,  -- This field doesn't exist in current table
    status,
    NULL AS report_url,    -- This field doesn't exist in current table
    created_at,
    created_at AS updated_at  -- Using created_at as fallback for updated_at
FROM public.incidents;

-- Enable RLS on the view
ALTER VIEW public.incidents_view OWNER TO postgres;

-- Grant permissions
GRANT SELECT ON public.incidents_view TO authenticated;
GRANT SELECT ON public.incidents_view TO anon;