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
