-- Fix callouts table - Add missing columns if table exists but columns are missing
-- This handles the case where the table exists but doesn't have the right columns

-- First, check if table exists and what columns it has
-- If callout_type doesn't exist, we need to either:
-- 1. Drop and recreate (if table is empty), or
-- 2. Add the missing columns

-- Option 1: Drop table if it exists and recreate (USE WITH CAUTION - will delete all data!)
-- Uncomment the next 3 lines ONLY if you don't have important data in the callouts table:
-- DROP TABLE IF EXISTS public.callouts CASCADE;
-- DROP FUNCTION IF EXISTS create_callout(UUID, VARCHAR, VARCHAR, TEXT, TEXT, JSONB, BOOLEAN) CASCADE;
-- DROP FUNCTION IF EXISTS update_callout_updated_at() CASCADE;

-- Option 2: Add missing columns to existing table (safer)
-- Check and add callout_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'callouts' 
    AND column_name = 'callout_type'
  ) THEN
    -- Table exists but column is missing - we need to check if table has data
    -- If table exists and has wrong structure, we might need to recreate it
    RAISE NOTICE 'callout_type column does not exist. Checking table structure...';
    
    -- If table has no data, we can safely recreate it
    IF (SELECT COUNT(*) FROM public.callouts) = 0 THEN
      RAISE NOTICE 'Table is empty - recreating with correct structure...';
      DROP TABLE IF EXISTS public.callouts CASCADE;
    ELSE
      RAISE EXCEPTION 'Table exists with data but wrong structure. Please backup and drop table first, or contact support.';
    END IF;
  END IF;
END $$;

-- Now create the table with correct structure (only if it doesn't exist)
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

DROP TRIGGER IF EXISTS trigger_update_callout_updated_at ON public.callouts;
CREATE TRIGGER trigger_update_callout_updated_at
  BEFORE UPDATE ON public.callouts
  FOR EACH ROW
  EXECUTE FUNCTION update_callout_updated_at();

-- Enable Row Level Security
ALTER TABLE public.callouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can create callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can update callouts for their company" ON public.callouts;
DROP POLICY IF EXISTS "Users can view company callouts" ON public.callouts;
DROP POLICY IF EXISTS "Users can create company callouts" ON public.callouts;
DROP POLICY IF EXISTS "Users can update callouts" ON public.callouts;
DROP POLICY IF EXISTS "Managers can close/reopen callouts" ON public.callouts;
DROP POLICY IF EXISTS "Admins can delete callouts" ON public.callouts;

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
    SELECT 1 FROM public.profiles p_check
    WHERE p_check.id = v_created_by AND p_check.company_id = v_company_id
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
    'open',
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

