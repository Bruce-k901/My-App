-- ============================================================================
-- Migration: 20260228800000_employee_documents_platform_admin_bypass.sql
-- Description: Add matches_current_tenant() bypass policies to employee_documents
--              table and employee-documents storage bucket so platform admins
--              can view/upload/manage documents when using "View As" mode.
-- ============================================================================

-- -----------------------------------------------------------------------
-- TABLE: employee_documents — tenant-scoped + platform admin bypass
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS employee_documents_tenant_select ON public.employee_documents;
CREATE POLICY employee_documents_tenant_select
  ON public.employee_documents FOR SELECT
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

DROP POLICY IF EXISTS employee_documents_tenant_insert ON public.employee_documents;
CREATE POLICY employee_documents_tenant_insert
  ON public.employee_documents FOR INSERT
  WITH CHECK (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

DROP POLICY IF EXISTS employee_documents_tenant_update ON public.employee_documents;
CREATE POLICY employee_documents_tenant_update
  ON public.employee_documents FOR UPDATE
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

DROP POLICY IF EXISTS employee_documents_tenant_delete ON public.employee_documents;
CREATE POLICY employee_documents_tenant_delete
  ON public.employee_documents FOR DELETE
  USING (
    public.is_service_role()
    OR public.matches_current_tenant(company_id)
  );

-- -----------------------------------------------------------------------
-- STORAGE: employee-documents bucket — platform admin bypass
-- Replace the 4 existing policies with versions that include platform admin
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS employee_docs_select_company ON storage.objects;
CREATE POLICY employee_docs_select_company
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.is_platform_admin = true
      )
    )
  );

DROP POLICY IF EXISTS employee_docs_insert_company ON storage.objects;
CREATE POLICY employee_docs_insert_company
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.is_platform_admin = true
      )
    )
  );

DROP POLICY IF EXISTS employee_docs_update_company ON storage.objects;
CREATE POLICY employee_docs_update_company
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.is_platform_admin = true
      )
    )
  )
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.is_platform_admin = true
      )
    )
  );

DROP POLICY IF EXISTS employee_docs_delete_company ON storage.objects;
CREATE POLICY employee_docs_delete_company
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
          AND p.is_platform_admin = true
      )
    )
  );

NOTIFY pgrst, 'reload schema';
