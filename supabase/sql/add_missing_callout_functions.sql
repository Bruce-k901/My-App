-- Add missing RPC functions for CalloutModal
-- These functions are needed for the CalloutModal to work properly

-- Function to get callouts for an asset
CREATE OR REPLACE FUNCTION get_asset_callouts(p_asset_id UUID)
RETURNS TABLE (
  id UUID,
  callout_type VARCHAR(20),
  priority VARCHAR(10),
  status VARCHAR(10),
  fault_description TEXT,
  repair_summary TEXT,
  notes TEXT,
  attachments JSONB,
  documents JSONB,
  log_timeline JSONB,
  troubleshooting_complete BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  contractor_name TEXT,
  created_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get company_id from asset and verify user has access
  SELECT a.company_id INTO v_company_id
  FROM public.assets a
  WHERE a.id = p_asset_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  -- Verify user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p_check
    WHERE p_check.id = auth.uid() AND p_check.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.callout_type,
    c.priority,
    c.status,
    c.fault_description,
    c.repair_summary,
    c.notes,
    c.attachments,
    c.documents,
    c.log_timeline,
    c.troubleshooting_complete,
    c.created_at,
    c.closed_at,
    c.reopened_at,
    cont.name::TEXT as contractor_name,
    COALESCE(
      (SELECT p_sub.full_name FROM public.profiles p_sub WHERE p_sub.id = c.created_by),
      'Unknown'
    )::TEXT as created_by_name
  FROM public.callouts c
  LEFT JOIN public.contractors cont ON cont.id = c.contractor_id
  WHERE c.asset_id = p_asset_id
    AND c.company_id = v_company_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Function to close a callout
CREATE OR REPLACE FUNCTION close_callout(
  p_callout_id UUID,
  p_repair_summary TEXT,
  p_documents JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_company_id UUID;
BEGIN
  -- Get current user role and company
  -- Try app_role first (common in profiles), fallback to checking both
  SELECT COALESCE(p_user.app_role, p_user.role)::TEXT, p_user.company_id INTO v_user_role, v_company_id
  FROM public.profiles p_user
  WHERE p_user.id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user is manager/admin/owner (case-insensitive check for both naming conventions)
  IF LOWER(v_user_role) NOT IN ('manager', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Only managers and admins can close callouts';
  END IF;
  
  -- Update the callout
  UPDATE public.callouts 
  SET 
    status = 'closed',
    repair_summary = p_repair_summary,
    documents = COALESCE(p_documents, '[]'::jsonb),
    closed_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = p_callout_id 
    AND company_id = v_company_id
    AND status = 'open';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Callout not found or already closed';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to reopen a callout
CREATE OR REPLACE FUNCTION reopen_callout(p_callout_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_company_id UUID;
BEGIN
  -- Get current user role and company
  -- Try app_role first (common in profiles), fallback to checking both
  SELECT COALESCE(p_user.app_role, p_user.role)::TEXT, p_user.company_id INTO v_user_role, v_company_id
  FROM public.profiles p_user
  WHERE p_user.id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user is manager/admin/owner (case-insensitive check for both naming conventions)
  IF LOWER(v_user_role) NOT IN ('manager', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Only managers and admins can reopen callouts';
  END IF;
  
  -- Update the callout
  UPDATE public.callouts 
  SET 
    status = 'open',
    reopened = TRUE,
    reopened_at = NOW(),
    updated_at = NOW()
  WHERE 
    id = p_callout_id 
    AND company_id = v_company_id
    AND status = 'closed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Callout not found or not closed';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions on all RPC functions
GRANT EXECUTE ON FUNCTION get_asset_callouts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_callout(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_callout(UUID) TO authenticated;

