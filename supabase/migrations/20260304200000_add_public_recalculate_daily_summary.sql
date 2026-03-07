-- The recalculate_daily_summary function exists in stockly schema only,
-- but PostgREST (and thus supabase-js .rpc()) can only see public schema.
-- Create a public wrapper that delegates to the stockly function.

CREATE OR REPLACE FUNCTION public.recalculate_daily_summary(
  p_company_id UUID,
  p_site_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
BEGIN
  PERFORM stockly.recalculate_daily_summary(p_company_id, p_site_id, p_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.recalculate_daily_summary(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_daily_summary(UUID, UUID, DATE) TO service_role;
