-- Temperature logs table and RLS policies

CREATE TABLE IF NOT EXISTS public.temperature_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  site_id uuid REFERENCES public.sites_redundant(id),
  asset_id uuid REFERENCES public.assets_redundant(id),
  recorded_by uuid REFERENCES public.profiles(id),
  reading numeric NOT NULL,
  unit text DEFAULT '°C',
  recorded_at timestamptz DEFAULT now(),
  day_part text,
  status text DEFAULT 'ok', -- ok / warning / failed
  notes text,
  photo_url text
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_temp_logs_company_time ON public.temperature_logs (company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_logs_site_time ON public.temperature_logs (site_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_logs_asset_time ON public.temperature_logs (asset_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_temp_logs_status ON public.temperature_logs (status);

-- Row Level Security
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

-- Company isolation: read
CREATE POLICY temperature_logs_select_company
  ON public.temperature_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );

-- Company isolation: insert
CREATE POLICY temperature_logs_insert_company
  ON public.temperature_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );

-- Company isolation: update (for corrections)
CREATE POLICY temperature_logs_update_company
  ON public.temperature_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );