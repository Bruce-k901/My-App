-- ============================================================================
-- Migration: 20251215082716_create_onboarding_packs.sql
-- Description: Role-based onboarding packs + per-employee assignments + acknowledgements
--
-- Concepts:
-- - company_onboarding_packs: templates per company, filtered by boh_foh + pay_type
-- - company_onboarding_pack_documents: which global_documents are included
-- - employee_onboarding_assignments: when a pack is sent to an employee
-- - employee_document_acknowledgements: employee marks doc as read/acknowledged
-- ============================================================================

DO $$
BEGIN
  -- Skip entire migration if required tables don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_documents') THEN
    RAISE NOTICE '⚠️ Required tables (companies, profiles, global_documents) do not exist - skipping onboarding packs migration';
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- Packs
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS public.company_onboarding_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NULL,
    boh_foh TEXT NOT NULL CHECK (boh_foh IN ('FOH', 'BOH', 'BOTH')),
    pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salaried')),
    is_base BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
  );

  CREATE INDEX IF NOT EXISTS idx_company_onboarding_packs_company ON public.company_onboarding_packs(company_id);
  CREATE INDEX IF NOT EXISTS idx_company_onboarding_packs_filters ON public.company_onboarding_packs(company_id, boh_foh, pay_type) WHERE deleted_at IS NULL;

  -- Updated_at trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_company_onboarding_packs_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_company_onboarding_packs_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $packs_trg$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $packs_trg$;

    CREATE TRIGGER set_company_onboarding_packs_updated_at
    BEFORE UPDATE ON public.company_onboarding_packs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_company_onboarding_packs_updated_at();
  END IF;

  -- ---------------------------------------------------------------------------
  -- Pack documents (link to global_documents)
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS public.company_onboarding_pack_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES public.company_onboarding_packs(id) ON DELETE CASCADE,
    global_document_id UUID NOT NULL REFERENCES public.global_documents(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_pack_documents_pack_doc ON public.company_onboarding_pack_documents(pack_id, global_document_id);
  CREATE INDEX IF NOT EXISTS idx_pack_documents_pack ON public.company_onboarding_pack_documents(pack_id);

  -- ---------------------------------------------------------------------------
  -- Assignments
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS public.employee_onboarding_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES public.company_onboarding_packs(id) ON DELETE RESTRICT,
    base_pack_id UUID NULL REFERENCES public.company_onboarding_packs(id) ON DELETE RESTRICT,
    sent_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_employee_onboarding_assignments_profile ON public.employee_onboarding_assignments(profile_id, sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_employee_onboarding_assignments_company ON public.employee_onboarding_assignments(company_id, sent_at DESC);

  -- ---------------------------------------------------------------------------
  -- Template documents
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS public.global_document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    global_document_id UUID NOT NULL REFERENCES public.global_documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_body TEXT NOT NULL,
    merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_global_document_templates_company_doc ON public.global_document_templates(company_id, global_document_id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_global_document_templates_company ON public.global_document_templates(company_id) WHERE deleted_at IS NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_global_document_templates_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_global_document_templates_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $tmpl_trg$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $tmpl_trg$;

    CREATE TRIGGER set_global_document_templates_updated_at
    BEFORE UPDATE ON public.global_document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_global_document_templates_updated_at();
  END IF;

  -- Per-employee rendered instances
  CREATE TABLE IF NOT EXISTS public.employee_onboarding_document_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.employee_onboarding_assignments(id) ON DELETE CASCADE,
    global_document_id UUID NOT NULL REFERENCES public.global_documents(id) ON DELETE CASCADE,
    template_id UUID NULL REFERENCES public.global_document_templates(id) ON DELETE SET NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    rendered_body TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_onboarding_document_instances_assignment_doc
    ON public.employee_onboarding_document_instances(assignment_id, global_document_id);

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_employee_onboarding_doc_instances_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_employee_onboarding_doc_instances_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $inst_trg$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $inst_trg$;

    CREATE TRIGGER set_employee_onboarding_doc_instances_updated_at
    BEFORE UPDATE ON public.employee_onboarding_document_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.set_employee_onboarding_doc_instances_updated_at();
  END IF;

  -- ---------------------------------------------------------------------------
  -- Acknowledgements
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS public.employee_document_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.employee_onboarding_assignments(id) ON DELETE CASCADE,
    global_document_id UUID NOT NULL REFERENCES public.global_documents(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_ack_assignment_doc ON public.employee_document_acknowledgements(assignment_id, global_document_id);
  CREATE INDEX IF NOT EXISTS idx_employee_ack_profile ON public.employee_document_acknowledgements(profile_id, acknowledged_at DESC);

  -- ---------------------------------------------------------------------------
  -- RLS
  -- ---------------------------------------------------------------------------
  ALTER TABLE public.company_onboarding_packs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.company_onboarding_pack_documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.employee_onboarding_assignments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.employee_document_acknowledgements ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.global_document_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.employee_onboarding_document_instances ENABLE ROW LEVEL SECURITY;

  -- Packs: company members can read, admins/managers can write
  DROP POLICY IF EXISTS onboarding_packs_select_company ON public.company_onboarding_packs;
  CREATE POLICY onboarding_packs_select_company
    ON public.company_onboarding_packs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = company_onboarding_packs.company_id
      )
    );

  DROP POLICY IF EXISTS onboarding_packs_write_company ON public.company_onboarding_packs;
  CREATE POLICY onboarding_packs_write_company
    ON public.company_onboarding_packs
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = company_onboarding_packs.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = company_onboarding_packs.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    );

  -- Pack documents: company members can read, admins/managers can write
  DROP POLICY IF EXISTS onboarding_pack_docs_select_company ON public.company_onboarding_pack_documents;
  CREATE POLICY onboarding_pack_docs_select_company
    ON public.company_onboarding_pack_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.company_onboarding_packs packs
        JOIN public.profiles p ON p.company_id = packs.company_id
        WHERE packs.id = company_onboarding_pack_documents.pack_id
          AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      )
    );

  DROP POLICY IF EXISTS onboarding_pack_docs_write_company ON public.company_onboarding_pack_documents;
  CREATE POLICY onboarding_pack_docs_write_company
    ON public.company_onboarding_pack_documents
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.company_onboarding_packs packs
        JOIN public.profiles p ON p.company_id = packs.company_id
        WHERE packs.id = company_onboarding_pack_documents.pack_id
          AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.company_onboarding_packs packs
        JOIN public.profiles p ON p.company_id = packs.company_id
        WHERE packs.id = company_onboarding_pack_documents.pack_id
          AND (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    );

  -- Assignments policies
  DROP POLICY IF EXISTS onboarding_assignments_select_company_or_own ON public.employee_onboarding_assignments;
  CREATE POLICY onboarding_assignments_select_company_or_own
    ON public.employee_onboarding_assignments
    FOR SELECT
    USING (
      profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_onboarding_assignments.company_id
      )
    );

  DROP POLICY IF EXISTS onboarding_assignments_insert_company_admin ON public.employee_onboarding_assignments;
  CREATE POLICY onboarding_assignments_insert_company_admin
    ON public.employee_onboarding_assignments
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_onboarding_assignments.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    );

  -- Acknowledgements policies
  DROP POLICY IF EXISTS onboarding_ack_select_company_or_own ON public.employee_document_acknowledgements;
  CREATE POLICY onboarding_ack_select_company_or_own
    ON public.employee_document_acknowledgements
    FOR SELECT
    USING (
      profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_document_acknowledgements.company_id
      )
    );

  DROP POLICY IF EXISTS onboarding_ack_insert_own ON public.employee_document_acknowledgements;
  CREATE POLICY onboarding_ack_insert_own
    ON public.employee_document_acknowledgements
    FOR INSERT
    WITH CHECK (
      profile_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_document_acknowledgements.company_id
      )
    );

  -- Templates policies
  DROP POLICY IF EXISTS global_document_templates_select_company ON public.global_document_templates;
  CREATE POLICY global_document_templates_select_company
    ON public.global_document_templates
    FOR SELECT
    USING (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = global_document_templates.company_id
      )
    );

  DROP POLICY IF EXISTS global_document_templates_write_company ON public.global_document_templates;
  CREATE POLICY global_document_templates_write_company
    ON public.global_document_templates
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = global_document_templates.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = global_document_templates.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    );

  -- Instances policies
  DROP POLICY IF EXISTS onboarding_doc_instances_select_company_or_own ON public.employee_onboarding_document_instances;
  CREATE POLICY onboarding_doc_instances_select_company_or_own
    ON public.employee_onboarding_document_instances
    FOR SELECT
    USING (
      profile_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_onboarding_document_instances.company_id
      )
    );

  DROP POLICY IF EXISTS onboarding_doc_instances_write_company_admin ON public.employee_onboarding_document_instances;
  CREATE POLICY onboarding_doc_instances_write_company_admin
    ON public.employee_onboarding_document_instances
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_onboarding_document_instances.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.company_id = employee_onboarding_document_instances.company_id
          AND p.app_role::text IN ('Owner','Admin','Manager','General Manager','Super Admin','owner','admin','manager','general_manager','super_admin')
      )
    );

  RAISE NOTICE '✅ Onboarding packs migration completed successfully';
END $$;
