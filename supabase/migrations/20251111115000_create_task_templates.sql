-- ============================================================================
-- Migration: 20251111115000_create_task_templates.sql
-- Description: Ensures task template infrastructure exists with seed data
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create table without optional foreign keys first
    CREATE TABLE IF NOT EXISTS public.task_templates (
      id uuid primary key default gen_random_uuid(),
      company_id uuid references public.companies(id) on delete cascade,
      site_id uuid references public.sites(id) on delete set null,
      name text not null,
      slug text not null,
      description text,
      category text not null,
      audit_category text,
      frequency text not null,
      time_of_day text,
      due_time text,
      start_time text,
      dayparts text[] default '{}'::text[],
      days_of_week smallint[] default '{}'::smallint[],
      recurrence_pattern jsonb,
      assigned_to_role text,
      assigned_to_user_id uuid references public.profiles(id) on delete set null,
      asset_id uuid,
      asset_type text,
      instructions text,
      repeatable_field_name text,
      evidence_types text[],
      requires_sop boolean default false,
      requires_risk_assessment boolean default false,
      linked_sop_id uuid,
      linked_risk_id uuid,
      compliance_standard text,
      is_critical boolean default false,
      triggers_contractor_on_failure boolean default false,
      contractor_type text,
      audience text,
      tags text[],
      weight numeric,
      is_active boolean default true,
      is_template_library boolean default false,
      active boolean default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Add optional foreign key constraints if referenced tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'task_templates' 
        AND constraint_name LIKE '%asset_id%'
      ) THEN
        ALTER TABLE public.task_templates 
        ADD CONSTRAINT task_templates_asset_id_fkey 
        FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_entries') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'task_templates' 
        AND constraint_name LIKE '%linked_sop_id%'
      ) THEN
        ALTER TABLE public.task_templates 
        ADD CONSTRAINT task_templates_linked_sop_id_fkey 
        FOREIGN KEY (linked_sop_id) REFERENCES public.sop_entries(id) ON DELETE SET NULL;
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_assessments') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'task_templates' 
        AND constraint_name LIKE '%linked_risk_id%'
      ) THEN
        ALTER TABLE public.task_templates 
        ADD CONSTRAINT task_templates_linked_risk_id_fkey 
        FOREIGN KEY (linked_risk_id) REFERENCES public.risk_assessments(id) ON DELETE SET NULL;
      END IF;
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS task_templates_company_slug_idx
      ON public.task_templates (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

    CREATE TABLE IF NOT EXISTS public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  field_name text not null,
  field_type text not null,
  label text not null,
  placeholder text,
  help_text text,
  options jsonb,
  required boolean default false,
  field_order integer not null default 0,
  created_at timestamptz not null default now()
);

    CREATE INDEX IF NOT EXISTS template_fields_template_idx
      ON public.template_fields (template_id, field_order);

    CREATE TABLE IF NOT EXISTS public.template_repeatable_labels (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  label text not null,
  label_value text,
  is_default boolean default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

    CREATE INDEX IF NOT EXISTS template_repeatable_labels_template_idx
      ON public.template_repeatable_labels (template_id, display_order);

    ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.template_fields ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.template_repeatable_labels ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_task_templates ON public.task_templates;
    CREATE POLICY tenant_select_task_templates
  on public.task_templates
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id is null
  );

    DROP POLICY IF EXISTS tenant_modify_task_templates ON public.task_templates;
    CREATE POLICY tenant_modify_task_templates
  on public.task_templates
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

    DROP POLICY IF EXISTS tenant_select_template_fields ON public.template_fields;
    CREATE POLICY tenant_select_template_fields
  on public.template_fields
  for select
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id)
          or t.company_id is null)
    )
  );

    DROP POLICY IF EXISTS tenant_modify_template_fields ON public.template_fields;
    CREATE POLICY tenant_modify_template_fields
  on public.template_fields
  for all
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  );

    DROP POLICY IF EXISTS tenant_select_template_repeatable_labels ON public.template_repeatable_labels;
    CREATE POLICY tenant_select_template_repeatable_labels
  on public.template_repeatable_labels
  for select
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id)
          or t.company_id is null)
    )
  );

    DROP POLICY IF EXISTS tenant_modify_template_repeatable_labels ON public.template_repeatable_labels;
    CREATE POLICY tenant_modify_template_repeatable_labels
  on public.template_repeatable_labels
  for all
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  );

    -- Seed of default compliance templates handled via seed script once schema exists.

    RAISE NOTICE 'Created task_templates infrastructure with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping task_templates';
  END IF;
END $$;
