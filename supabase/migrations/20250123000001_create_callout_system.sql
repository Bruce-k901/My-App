-- Migration: Create Complete Callout System
-- This migration creates the callouts table, RLS policies, and RPC functions

-- Create callouts table with comprehensive structure
CREATE TABLE IF NOT EXISTS public.callouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Callout details
  callout_type VARCHAR(20) NOT NULL CHECK (callout_type IN ('reactive', 'warranty', 'ppm')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'urgent')),
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reopened')),
  
  -- Content
  fault_description TEXT,
  repair_summary TEXT,
  notes TEXT,
  
  -- Attachments (JSON array of file URLs)
  attachments JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Timeline tracking (JSON object with timestamps)
  log_timeline JSONB DEFAULT '{}'::jsonb,
  
  -- Flags
  reopened BOOLEAN DEFAULT FALSE,
  troubleshooting_complete BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  reopened_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT callout_repair_summary_required CHECK (
    (status = 'closed' AND repair_summary IS NOT NULL) OR 
    (status != 'closed')
  ),
  CONSTRAINT callout_fault_description_required CHECK (
    (callout_type != 'ppm' AND fault_description IS NOT NULL) OR 
    (callout_type = 'ppm')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_callouts_company_id ON public.callouts(company_id);
CREATE INDEX IF NOT EXISTS idx_callouts_asset_id ON public.callouts(asset_id);
CREATE INDEX IF NOT EXISTS idx_callouts_site_id ON public.callouts(site_id);
CREATE INDEX IF NOT EXISTS idx_callouts_contractor_id ON public.callouts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_callouts_created_by ON public.callouts(created_by);
CREATE INDEX IF NOT EXISTS idx_callouts_status ON public.callouts(status);
CREATE INDEX IF NOT EXISTS idx_callouts_callout_type ON public.callouts(callout_type);
CREATE INDEX IF NOT EXISTS idx_callouts_created_at ON public.callouts(created_at);
CREATE INDEX IF NOT EXISTS idx_callouts_company_status ON public.callouts(company_id, status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_callout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_callout_updated_at
  BEFORE UPDATE ON public.callouts
  FOR EACH ROW
  EXECUTE FUNCTION update_callout_updated_at();

-- Create timeline update function
CREATE OR REPLACE FUNCTION update_callout_timeline()
RETURNS TRIGGER AS $$
DECLARE
  timeline JSONB;
BEGIN
  -- Initialize timeline if not exists
  IF NEW.log_timeline IS NULL THEN
    NEW.log_timeline = '{}'::jsonb;
  END IF;
  
  timeline := NEW.log_timeline;
  
  -- Handle different operations
  IF TG_OP = 'INSERT' THEN
    timeline := jsonb_set(timeline, '{created}', to_jsonb(NEW.created_at));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing timeline
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'closed' THEN
          timeline := jsonb_set(timeline, '{closed}', to_jsonb(NOW()));
        WHEN 'open' THEN
          IF OLD.status = 'closed' THEN
            timeline := jsonb_set(timeline, '{reopened}', to_jsonb(NOW()));
          END IF;
      END CASE;
    END IF;
    
    -- Always update the updated timestamp
    timeline := jsonb_set(timeline, '{updated}', to_jsonb(NOW()));
  END IF;
  
  NEW.log_timeline := timeline;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_callout_timeline
  BEFORE INSERT OR UPDATE ON public.callouts
  FOR EACH ROW
  EXECUTE FUNCTION update_callout_timeline();

-- Enable RLS
ALTER TABLE public.callouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Users can view callouts from their company
CREATE POLICY "Users can view company callouts" ON public.callouts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy 2: Users can create callouts for their company
CREATE POLICY "Users can create company callouts" ON public.callouts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy 3: Users can update open callouts, managers can update all
CREATE POLICY "Users can update callouts" ON public.callouts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND (
      status = 'open' OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('manager', 'admin')
      )
    )
  );

-- Policy 4: Only managers can close/reopen callouts
CREATE POLICY "Managers can close/reopen callouts" ON public.callouts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Policy 5: Only admins can delete callouts
CREATE POLICY "Admins can delete callouts" ON public.callouts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RPC Functions for Callout Operations

-- Function to create a new callout
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
    SELECT 1 FROM public.profiles 
    WHERE id = v_created_by AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied to this company';
  END IF;
  
  -- Insert the callout
  INSERT INTO public.callouts (
    company_id,
    asset_id,
    site_id,
    contractor_id,
    created_by,
    callout_type,
    priority,
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
    p_fault_description,
    p_notes,
    p_attachments,
    p_troubleshooting_complete
  ) RETURNING id INTO v_callout_id;
  
  RETURN v_callout_id;
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
  v_user_role VARCHAR(20);
  v_company_id UUID;
BEGIN
  -- Get current user role
  SELECT role, company_id INTO v_user_role, v_company_id
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user is manager or admin
  IF v_user_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Only managers and admins can close callouts';
  END IF;
  
  -- Update the callout
  UPDATE public.callouts 
  SET 
    status = 'closed',
    repair_summary = p_repair_summary,
    documents = p_documents,
    closed_at = NOW()
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
  v_user_role VARCHAR(20);
  v_company_id UUID;
  v_callout_record RECORD;
BEGIN
  -- Get current user role
  SELECT role, company_id INTO v_user_role, v_company_id
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user is manager or admin
  IF v_user_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Only managers and admins can reopen callouts';
  END IF;
  
  -- Get callout details
  SELECT * INTO v_callout_record
  FROM public.callouts 
  WHERE id = p_callout_id AND company_id = v_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Callout not found';
  END IF;
  
  -- Check if it's the latest callout for this asset
  IF NOT EXISTS (
    SELECT 1 FROM public.callouts 
    WHERE asset_id = v_callout_record.asset_id 
    AND id != p_callout_id 
    AND created_at > v_callout_record.created_at
  ) THEN
    -- Check if closed within 3 months
    IF v_callout_record.closed_at IS NOT NULL 
       AND v_callout_record.closed_at > NOW() - INTERVAL '3 months' THEN
      
      -- Reopen the callout
      UPDATE public.callouts 
      SET 
        status = 'open',
        reopened = TRUE,
        reopened_at = NOW()
      WHERE id = p_callout_id;
      
      RETURN TRUE;
    ELSE
      RAISE EXCEPTION 'Callout cannot be reopened - closed more than 3 months ago';
    END IF;
  ELSE
    RAISE EXCEPTION 'Callout cannot be reopened - not the latest callout for this asset';
  END IF;
  
  RETURN FALSE;
END;
$$;

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
  -- Get company_id from asset
  SELECT company_id INTO v_company_id
  FROM public.assets 
  WHERE id = p_asset_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  -- Check user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Return callouts
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
    co.name as contractor_name,
    p.name as created_by_name
  FROM public.callouts c
  LEFT JOIN public.contractors co ON co.id = c.contractor_id
  LEFT JOIN public.profiles p ON p.id = c.created_by
  WHERE c.asset_id = p_asset_id
  ORDER BY c.created_at DESC;
END;
$$;
