-- ============================================================================
-- Migration: 20260223000001_create_task_documents_bucket.sql
-- Description: Create task-documents storage bucket for template reference files
-- - SOPs, risk assessments, guides, and other documents attached to task templates
-- - Public bucket so staff can view attached reference documents when completing tasks
-- Path convention: task-documents/<timestamp>-<random>.<ext>
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'task-documents',
      'task-documents',
      true,
      10485760, -- 10MB
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS task_documents_select_authenticated ON storage.objects;
    DROP POLICY IF EXISTS task_documents_insert_authenticated ON storage.objects;
    DROP POLICY IF EXISTS task_documents_update_authenticated ON storage.objects;
    DROP POLICY IF EXISTS task_documents_delete_authenticated ON storage.objects;

    CREATE POLICY task_documents_select_authenticated
      ON storage.objects FOR SELECT
      USING (bucket_id = 'task-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY task_documents_insert_authenticated
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'task-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY task_documents_update_authenticated
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'task-documents' AND auth.uid() IS NOT NULL)
      WITH CHECK (bucket_id = 'task-documents' AND auth.uid() IS NOT NULL);

    CREATE POLICY task_documents_delete_authenticated
      ON storage.objects FOR DELETE
      USING (bucket_id = 'task-documents' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
