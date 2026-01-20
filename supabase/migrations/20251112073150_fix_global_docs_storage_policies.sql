-- ============================================================================
-- Migration: 20251112073150_fix_global_docs_storage_policies.sql
-- Description: Update storage global_docs policies to consider auth_user_id as well
-- ============================================================================
-- Note: This migration will be skipped if required table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if required table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Remove existing policies if they exist
    DROP POLICY IF EXISTS global_docs_select_company ON storage.objects;
    DROP POLICY IF EXISTS global_docs_insert_company ON storage.objects;
    DROP POLICY IF EXISTS global_docs_update_company ON storage.objects;
    DROP POLICY IF EXISTS global_docs_delete_company ON storage.objects;

    -- Allow authenticated users to SELECT objects in their company path
    CREATE POLICY global_docs_select_company
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'global_docs'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    -- Allow authenticated users to INSERT objects into their company path
    CREATE POLICY global_docs_insert_company
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'global_docs'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    -- Allow authenticated users to UPDATE objects within their company path
    CREATE POLICY global_docs_update_company
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'global_docs'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      )
      WITH CHECK (
        bucket_id = 'global_docs'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    -- Allow authenticated users to DELETE objects in their company path
    CREATE POLICY global_docs_delete_company
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'global_docs'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
            AND split_part(storage.objects.name, '/', 1) = coalesce(p.company_id::text, '')
        )
      );

    RAISE NOTICE 'Fixed global_docs storage policies';

  ELSE
    RAISE NOTICE '⚠️ Required table (profiles) does not exist yet - skipping global_docs storage policies';
  END IF;
END $$;




