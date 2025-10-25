-- Enhanced security policies and missing RLS

-- Enable RLS on all tables that might be missing it
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppm_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppm_history ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY IF NOT EXISTS profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Sites table policies
CREATE POLICY IF NOT EXISTS sites_select_company
  ON public.sites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
    )
  );

CREATE POLICY IF NOT EXISTS sites_insert_company
  ON public.sites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS sites_update_company
  ON public.sites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin')
    )
  );

-- Contractors table policies
CREATE POLICY IF NOT EXISTS contractors_select_company
  ON public.contractors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
    )
  );

CREATE POLICY IF NOT EXISTS contractors_insert_company
  ON public.contractors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY IF NOT EXISTS contractors_update_company
  ON public.contractors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- PPM Schedule policies
CREATE POLICY IF NOT EXISTS ppm_schedule_select_company
  ON public.ppm_schedule
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ppm_schedule.asset_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS ppm_schedule_insert_company
  ON public.ppm_schedule
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ppm_schedule.asset_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY IF NOT EXISTS ppm_schedule_update_company
  ON public.ppm_schedule
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assets a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ppm_schedule.asset_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- PPM History policies
CREATE POLICY IF NOT EXISTS ppm_history_select_company
  ON public.ppm_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ppm_schedule ps
      JOIN public.assets a ON a.id = ps.asset_id
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE ps.id = ppm_history.ppm_id
        AND p.id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS ppm_history_insert_company
  ON public.ppm_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ppm_schedule ps
      JOIN public.assets a ON a.id = ps.asset_id
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE ps.id = ppm_history.ppm_id
        AND p.id = auth.uid()
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(
  required_role text,
  target_company_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile record;
BEGIN
  -- Get user profile
  SELECT app_role, company_id
  INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check company access if target_company_id is provided
  IF target_company_id IS NOT NULL AND user_profile.company_id != target_company_id THEN
    RETURN false;
  END IF;
  
  -- Check role permission
  CASE required_role
    WHEN 'owner' THEN
      RETURN LOWER(user_profile.app_role) = 'owner';
    WHEN 'admin' THEN
      RETURN LOWER(user_profile.app_role) IN ('owner', 'admin');
    WHEN 'manager' THEN
      RETURN LOWER(user_profile.app_role) IN ('owner', 'admin', 'manager');
    WHEN 'staff' THEN
      RETURN LOWER(user_profile.app_role) IN ('owner', 'admin', 'manager', 'staff');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_permission(text, uuid) TO authenticated;

-- Create function to get user's accessible sites
CREATE OR REPLACE FUNCTION public.get_user_accessible_sites()
RETURNS TABLE(site_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.id
  FROM public.sites s
  JOIN public.profiles p ON p.company_id = s.company_id
  WHERE p.id = auth.uid()
    AND (
      LOWER(p.app_role) IN ('owner', 'admin')
      OR (
        LOWER(p.app_role) IN ('manager', 'staff')
        AND s.id = p.site_id
      )
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_accessible_sites() TO authenticated;
