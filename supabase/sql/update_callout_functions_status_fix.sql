-- Quick fix: Update callout functions to ensure status is set and callouts are returned correctly
-- Run this after fix_callouts_table_columns.sql and add_missing_callout_functions.sql

-- Update create_callout to explicitly set status = 'open'
CREATE OR REPLACE FUNCTION create_callout(
  p_asset_id UUID,
  p_callout_type VARCHAR(20),
  p_priority VARCHAR(10) DEFAULT 'medium',
  p_fault_description TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_attachments JSONB DEFAULT '[]'::jsonb,
  p_troubleshooting_complete BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_callout_id UUID;
  v_company_id UUID;
  v_site_id UUID;
  v_contractor_id UUID;
  v_created_by UUID;
BEGIN
  -- Get current user
  v_created_by := auth.uid();
  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Get asset details and validate
  SELECT 
    a.company_id,
    a.site_id,
    CASE 
      WHEN p_callout_type = 'ppm' THEN a.ppm_contractor_id
      WHEN p_callout_type = 'warranty' THEN a.warranty_contractor_id
      ELSE a.reactive_contractor_id
    END
  INTO v_company_id, v_site_id, v_contractor_id
  FROM public.assets a
  WHERE a.id = p_asset_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found or access denied';
  END IF;
  
  -- Validate user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p_validate
    WHERE p_validate.id = v_created_by AND p_validate.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied to this company';
  END IF;
  
  -- Insert the callout (explicitly set status to 'open')
  INSERT INTO public.callouts (
    company_id,
    asset_id,
    site_id,
    contractor_id,
    created_by,
    callout_type,
    priority,
    status,
    fault_description,
    notes,
    attachments,
    troubleshooting_complete
  ) VALUES (
    v_company_id,
    p_asset_id,
    v_site_id,
    v_contractor_id,
    v_created_by,
    p_callout_type,
    p_priority,
    'open',  -- Explicitly set status
    p_fault_description,
    p_notes,
    p_attachments,
    p_troubleshooting_complete
  ) RETURNING id INTO v_callout_id;
  
  RETURN v_callout_id;
END;
$$;

-- Update get_asset_callouts to include company_id filtering
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_callout TO authenticated;
GRANT EXECUTE ON FUNCTION get_asset_callouts TO authenticated;

