-- DROP AND RECREATE CALLOUTS TABLE
-- WARNING: This will delete all existing callout data!
-- Only use this if you're okay losing all callout records

-- Drop dependent objects first
DROP TRIGGER IF EXISTS trigger_update_callout_updated_at ON public.callouts;
DROP TRIGGER IF EXISTS trigger_update_callout_timeline ON public.callouts;
DROP FUNCTION IF EXISTS update_callout_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_callout_timeline() CASCADE;
DROP FUNCTION IF EXISTS create_callout(UUID, VARCHAR, VARCHAR, TEXT, TEXT, JSONB, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS close_callout(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS reopen_callout(UUID) CASCADE;
DROP POLICY IF EXISTS "Users can view callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can create callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can update callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can view company callouts" ON public.callouts;
DROP POLICY IF EXISTS "Users can create company callouts" ON public.callouts;
DROP POLICY IF EXISTS "Users can update callouts" ON public.callouts;
DROP POLICY IF EXISTS "Managers can close/reopen callouts" ON public.callouts;
DROP POLICY IF EXISTS "Admins can delete callouts" ON public.callouts;

-- Drop the table
DROP TABLE IF EXISTS public.callouts CASCADE;

-- Create callouts table with comprehensive structure
CREATE TABLE public.callouts (
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
CREATE INDEX idx_callouts_company_id ON public.callouts(company_id);
CREATE INDEX idx_callouts_asset_id ON public.callouts(asset_id);
CREATE INDEX idx_callouts_site_id ON public.callouts(site_id);
CREATE INDEX idx_callouts_contractor_id ON public.callouts(contractor_id);
CREATE INDEX idx_callouts_created_by ON public.callouts(created_by);
CREATE INDEX idx_callouts_status ON public.callouts(status);
CREATE INDEX idx_callouts_callout_type ON public.callouts(callout_type);
CREATE INDEX idx_callouts_created_at ON public.callouts(created_at);
CREATE INDEX idx_callouts_company_status ON public.callouts(company_id, status);

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

-- Enable Row Level Security
ALTER TABLE public.callouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view callouts for their company"
  ON public.callouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.company_id = callouts.company_id
    )
  );

CREATE POLICY "Users can create callouts for their company"
  ON public.callouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.company_id = callouts.company_id
    )
  );

CREATE POLICY "Users can update callouts for their company"
  ON public.callouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.company_id = callouts.company_id
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.callouts TO authenticated;

-- Create RPC function for creating callouts
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

-- Grant execute permission on RPC function
GRANT EXECUTE ON FUNCTION create_callout TO authenticated;

