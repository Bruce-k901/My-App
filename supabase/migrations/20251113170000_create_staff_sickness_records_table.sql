-- Create staff_sickness_records table for logging staff illness and exclusions
CREATE TABLE IF NOT EXISTS public.staff_sickness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  staff_member_name TEXT NOT NULL,
  staff_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  illness_onset_date DATE NOT NULL,
  illness_onset_time TIME,
  symptoms TEXT NOT NULL,
  exclusion_period_start DATE NOT NULL,
  exclusion_period_end DATE,
  return_to_work_date DATE,
  medical_clearance_required BOOLEAN DEFAULT false,
  medical_clearance_received BOOLEAN DEFAULT false,
  manager_notified BOOLEAN DEFAULT false,
  food_handling_restricted BOOLEAN DEFAULT true,
  symptomatic_in_food_areas BOOLEAN DEFAULT false,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cleared', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_company_id ON public.staff_sickness_records(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_site_id ON public.staff_sickness_records(site_id);
CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_status ON public.staff_sickness_records(status);
CREATE INDEX IF NOT EXISTS idx_staff_sickness_records_illness_onset_date ON public.staff_sickness_records(illness_onset_date DESC);

-- Enable RLS
ALTER TABLE public.staff_sickness_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view staff sickness records for their company"
  ON public.staff_sickness_records
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert staff sickness records for their company"
  ON public.staff_sickness_records
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update staff sickness records for their company"
  ON public.staff_sickness_records
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete staff sickness records for their company"
  ON public.staff_sickness_records
  FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_staff_sickness_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_sickness_records_updated_at
  BEFORE UPDATE ON public.staff_sickness_records
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_sickness_records_updated_at();



