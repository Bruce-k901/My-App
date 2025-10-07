-- Tasks table and RLS policies

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  site_id uuid NOT NULL,
  checklist_template_id uuid NULL,
  name text NOT NULL,
  day_part text NULL,
  frequency text NULL,
  due_date date NOT NULL,
  assigned_to uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz NULL,
  notes text NULL,
  photo_url text NULL,
  photo_path text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_site_due ON public.tasks (site_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_company_due ON public.tasks (company_id, due_date);

-- Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (service role bypasses RLS implicitly)

-- Policy: company members can select their company tasks
CREATE POLICY tasks_select_company
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

-- Policy: company members can update tasks in their company
CREATE POLICY tasks_update_company
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

-- Optional: restrict insert to service role only (anon/users should not insert tasks)
-- If you need user inserts (e.g. ad-hoc tasks), create a separate policy.
CREATE POLICY tasks_insert_service_only
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    -- Only allow inserts when JWT has role claim 'service_role'; in Supabase, service role bypasses RLS.
    -- This CHECK always false for anon/auth users, effectively blocking inserts.
    false
  );

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();