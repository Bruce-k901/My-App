-- ============================================================================
-- Migration: 20251215081025_create_employee_documents.sql
-- Description: Employee document management (uploads + metadata)
-- - Creates private storage bucket: employee-documents
-- - Creates employee_documents table (soft delete)
-- - Adds RLS policies for company access
-- - Adds storage.objects policies for company-scoped paths
-- Path convention: <company_id>/<profile_id>/<document_type>/<uuid>_<filename>
-- ============================================================================

DO $$
BEGIN
  -- --------------------------------------------------------------------------
  -- Storage bucket
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'employee-documents',
      'employee-documents',
      false,
      20971520, -- 20MB
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- --------------------------------------------------------------------------
  -- Table
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS public.employee_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

      document_type TEXT NOT NULL,
      title TEXT NOT NULL,

      bucket_id TEXT NOT NULL DEFAULT 'employee-documents',
      file_path TEXT NOT NULL,
      mime_type TEXT NULL,
      file_size BIGINT NULL,

      expires_at DATE NULL,
      verified_at TIMESTAMPTZ NULL,
      verified_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

      uploaded_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      deleted_at TIMESTAMPTZ NULL,
      deleted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

      notes TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_employee_documents_company_profile ON public.employee_documents(company_id, profile_id);
    CREATE INDEX IF NOT EXISTS idx_employee_documents_profile ON public.employee_documents(profile_id);
    CREATE INDEX IF NOT EXISTS idx_employee_documents_deleted_at ON public.employee_documents(deleted_at) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON public.employee_documents(document_type);

    -- Updated_at trigger (safe no-op if trigger exists)
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_employee_documents_updated_at'
    ) THEN
      CREATE OR REPLACE FUNCTION public.set_employee_documents_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $employee_docs_trg$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $employee_docs_trg$;

      CREATE TRIGGER set_employee_documents_updated_at
      BEFORE UPDATE ON public.employee_documents
      FOR EACH ROW
      EXECUTE FUNCTION public.set_employee_documents_updated_at();
    END IF;

    -- ------------------------------------------------------------------------
    -- RLS
    -- ------------------------------------------------------------------------
    ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS employee_documents_select_company ON public.employee_documents;
    DROP POLICY IF EXISTS employee_documents_insert_company ON public.employee_documents;
    DROP POLICY IF EXISTS employee_documents_update_company ON public.employee_documents;
    DROP POLICY IF EXISTS employee_documents_delete_company ON public.employee_documents;

    CREATE POLICY employee_documents_select_company
      ON public.employee_documents
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = employee_documents.company_id
        )
      );

    CREATE POLICY employee_documents_insert_company
      ON public.employee_documents
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = employee_documents.company_id
        )
      );

    CREATE POLICY employee_documents_update_company
      ON public.employee_documents
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = employee_documents.company_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = employee_documents.company_id
        )
      );

    CREATE POLICY employee_documents_delete_company
      ON public.employee_documents
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND p.company_id = employee_documents.company_id
        )
      );

  END IF;

  -- --------------------------------------------------------------------------
  -- Storage policies for employee-documents (company-scoped)
  -- We scope by folder[0] = company_id
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS employee_docs_select_company ON storage.objects;
    DROP POLICY IF EXISTS employee_docs_insert_company ON storage.objects;
    DROP POLICY IF EXISTS employee_docs_update_company ON storage.objects;
    DROP POLICY IF EXISTS employee_docs_delete_company ON storage.objects;

    CREATE POLICY employee_docs_select_company
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'employee-documents'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    CREATE POLICY employee_docs_insert_company
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'employee-documents'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    CREATE POLICY employee_docs_update_company
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'employee-documents'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      )
      WITH CHECK (
        bucket_id = 'employee-documents'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    CREATE POLICY employee_docs_delete_company
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'employee-documents'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );
  END IF;
END $$;
