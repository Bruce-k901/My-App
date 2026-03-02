-- =============================================
-- ROTA APPROVAL WORKFLOW + APPROVER ROLES
-- Draft -> Pending approval -> Approved -> Published
-- Adds Area/Ops manager roles for approval alongside Owner/Admin
-- =============================================

DO $$
BEGIN
  -- 1) Extend app_role enum (idempotent)
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'app_role') THEN
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Area Manager';
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;

    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Ops Manager';
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;
  END IF;

  -- 2) Ensure rotas table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rotas') THEN
    -- Add approval tracking columns
    ALTER TABLE public.rotas
      ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS submitted_for_approval_by UUID REFERENCES public.profiles(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id);

    -- Expand status values (drop old check constraint and replace)
    ALTER TABLE public.rotas DROP CONSTRAINT IF EXISTS rotas_status_check;
    ALTER TABLE public.rotas
      ADD CONSTRAINT rotas_status_check
      CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'archived'));

    -- Helper to normalize roles robustly: "General Manager" -> "general_manager"
    CREATE OR REPLACE FUNCTION public.normalize_role(p_role TEXT)
    RETURNS TEXT
    LANGUAGE sql
    IMMUTABLE
    AS $func$
      SELECT LOWER(REPLACE(COALESCE(p_role, ''), ' ', '_'));
    $func$;

    -- Submit rota for approval (manager action)
    CREATE OR REPLACE FUNCTION public.submit_rota_for_approval(p_rota_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
      v_role_key TEXT;
    BEGIN
      v_company_id := public.get_user_company_id();
      v_role_key := public.normalize_role(public.get_user_role());

      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
      END IF;

      IF v_role_key NOT IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager') THEN
        RAISE EXCEPTION 'Not allowed';
      END IF;

      UPDATE public.rotas
      SET
        status = 'pending_approval',
        submitted_for_approval_at = NOW(),
        submitted_for_approval_by = auth.uid(),
        updated_at = NOW()
      WHERE id = p_rota_id
        AND company_id = v_company_id
        AND status = 'draft';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Rota not found or not in draft';
      END IF;
    END;
    $func$;

    -- Approve rota (owner/admin/area/ops manager)
    CREATE OR REPLACE FUNCTION public.approve_rota(p_rota_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
      v_role_key TEXT;
    BEGIN
      v_company_id := public.get_user_company_id();
      v_role_key := public.normalize_role(public.get_user_role());

      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
      END IF;

      IF v_role_key NOT IN ('admin', 'owner', 'area_manager', 'ops_manager') THEN
        RAISE EXCEPTION 'Not allowed';
      END IF;

      UPDATE public.rotas
      SET
        status = 'approved',
        approved_at = NOW(),
        approved_by = auth.uid(),
        updated_at = NOW()
      WHERE id = p_rota_id
        AND company_id = v_company_id
        AND status = 'pending_approval';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Rota not found or not pending approval';
      END IF;
    END;
    $func$;

    -- Publish rota (requires approved unless admin/owner override)
    CREATE OR REPLACE FUNCTION public.publish_rota(p_rota_id UUID)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
      v_role_key TEXT;
      v_status TEXT;
    BEGIN
      v_company_id := public.get_user_company_id();
      v_role_key := public.normalize_role(public.get_user_role());

      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
      END IF;

      IF v_role_key NOT IN ('admin', 'owner', 'area_manager', 'ops_manager') THEN
        RAISE EXCEPTION 'Not allowed';
      END IF;

      SELECT status INTO v_status FROM public.rotas WHERE id = p_rota_id AND company_id = v_company_id;
      IF v_status IS NULL THEN
        RAISE EXCEPTION 'Rota not found';
      END IF;

      -- Require approval, except admin/owner can override from pending_approval (useful for emergencies)
      IF v_status <> 'approved' AND NOT (v_role_key IN ('admin', 'owner') AND v_status = 'pending_approval') THEN
        RAISE EXCEPTION 'Rota must be approved before publishing';
      END IF;

      UPDATE public.rotas
      SET
        status = 'published',
        published_at = NOW(),
        published_by = auth.uid(),
        updated_at = NOW()
      WHERE id = p_rota_id AND company_id = v_company_id;
    END;
    $func$;

    GRANT EXECUTE ON FUNCTION public.submit_rota_for_approval(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.approve_rota(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.publish_rota(UUID) TO authenticated;

    -- 3) Update RLS policies for rota tables to include new roles (and fix role normalization)
    -- Rotas
    DROP POLICY IF EXISTS "Managers can manage rotas" ON public.rotas;
    CREATE POLICY "Managers can manage rotas" ON public.rotas
      FOR ALL USING (
        company_id = public.get_user_company_id()
        AND public.normalize_role(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
      );

    -- Shifts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_shifts') THEN
      DROP POLICY IF EXISTS "Managers can manage shifts" ON public.rota_shifts;
      CREATE POLICY "Managers can manage shifts" ON public.rota_shifts
        FOR ALL USING (
          company_id = public.get_user_company_id()
          AND public.normalize_role(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
        );
    END IF;

    -- Templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_templates') THEN
      DROP POLICY IF EXISTS "Managers can manage templates" ON public.shift_templates;
      CREATE POLICY "Managers can manage templates" ON public.shift_templates
        FOR ALL USING (
          company_id = public.get_user_company_id()
          AND public.normalize_role(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
        );
    END IF;

    -- Sections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_sections') THEN
      DROP POLICY IF EXISTS "Managers can manage rota sections" ON public.rota_sections;
      CREATE POLICY "Managers can manage rota sections" ON public.rota_sections
        FOR ALL USING (
          company_id = public.get_user_company_id()
          AND public.normalize_role(public.get_user_role()) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager')
        );
    END IF;

    NOTIFY pgrst, 'reload schema';
    RAISE NOTICE 'Added rota approval workflow + updated role checks';
  ELSE
    RAISE NOTICE '⚠️ rotas table does not exist yet - skipping rota approval workflow migration';
  END IF;
END $$;





