-- Incidents & Alerts table and RLS policies

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  site_id uuid REFERENCES public.sites(id),
  reported_by uuid REFERENCES public.profiles(id),
  type text NOT NULL, -- Equipment / Safety / Food / Other
  description text NOT NULL,
  severity text DEFAULT 'medium', -- low/medium/high
  status text DEFAULT 'open', -- open/resolved
  assigned_to uuid REFERENCES public.profiles(id),
  resolution_notes text,
  resolved_at timestamptz,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_incidents_company_created ON public.incidents (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_site_created ON public.incidents (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents (severity);

-- Row Level Security
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Read within company
CREATE POLICY incidents_select_company
  ON public.incidents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

-- Insert within company by authenticated users (staff/managers)
CREATE POLICY incidents_insert_company
  ON public.incidents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

-- Update within company (e.g., assign, resolve)
CREATE POLICY incidents_update_company
  ON public.incidents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

-- No deletes for normal users