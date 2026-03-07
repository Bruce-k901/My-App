-- ============================================================================
-- Migration: 20260131000000_create_documents_bucket.sql
-- Description: Create documents storage bucket for PPM certificates and general documents
-- - Creates public storage bucket: documents
-- - Adds simple RLS policies for authenticated users
-- Path convention: ppm-certificates/<asset_id>/<timestamp>.<ext>
-- ============================================================================

DO $$
BEGIN
  -- --------------------------------------------------------------------------
  -- Storage bucket (public like other certificate/document buckets)
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'documents',
      'documents',
      true,
      20971520, -- 20MB
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  -- --------------------------------------------------------------------------
  -- Storage policies for documents bucket (authenticated users)
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS documents_select_authenticated ON storage.objects;
    DROP POLICY IF EXISTS documents_insert_authenticated ON storage.objects;
    DROP POLICY IF EXISTS documents_update_authenticated ON storage.objects;
    DROP POLICY IF EXISTS documents_delete_authenticated ON storage.objects;

    -- Allow authenticated users to SELECT documents
    CREATE POLICY documents_select_authenticated
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
      );

    -- Allow authenticated users to INSERT documents
    CREATE POLICY documents_insert_authenticated
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
      );

    -- Allow authenticated users to UPDATE documents
    CREATE POLICY documents_update_authenticated
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
      )
      WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
      );

    -- Allow authenticated users to DELETE documents
    CREATE POLICY documents_delete_authenticated
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'documents'
        AND auth.uid() IS NOT NULL
      );
  END IF;
END $$;
