-- Integration connections for linking external services (printers, POS, accounting)
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL
    CHECK (integration_type IN ('label_printer','pos_system','xero','quickbooks','other')),
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected','disconnected','error','pending')),
  config JSONB NOT NULL DEFAULT '{}',
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,
  connected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, integration_type, integration_name)
);

-- RLS
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

-- Company-scoped read for all authenticated users
DROP POLICY IF EXISTS "integration_connections_select" ON public.integration_connections;
CREATE POLICY "integration_connections_select"
  ON public.integration_connections FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Admin-only insert/update/delete (uses user_roles + roles tables with profile_id/role_id pattern)
DROP POLICY IF EXISTS "integration_connections_insert" ON public.integration_connections;
CREATE POLICY "integration_connections_insert"
  ON public.integration_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS "integration_connections_update" ON public.integration_connections;
CREATE POLICY "integration_connections_update"
  ON public.integration_connections FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS "integration_connections_delete" ON public.integration_connections;
CREATE POLICY "integration_connections_delete"
  ON public.integration_connections FOR DELETE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = auth.uid()
      AND r.slug IN ('owner', 'admin')
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_integration_connections_company
  ON public.integration_connections (company_id, integration_type);

NOTIFY pgrst, 'reload schema';
