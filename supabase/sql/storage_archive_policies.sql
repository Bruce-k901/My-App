-- Storage policies for archive folder in global_docs bucket
-- Allows archiving old document versions when new versions are uploaded

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS global_docs_archive_insert_company ON storage.objects;
DROP POLICY IF EXISTS global_docs_archive_select_company ON storage.objects;
DROP POLICY IF EXISTS global_docs_archive_update_company ON storage.objects;
DROP POLICY IF EXISTS global_docs_archive_delete_company ON storage.objects;

-- Allow authenticated users to INSERT objects into archive folder within their company path
CREATE POLICY global_docs_archive_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'global_docs'
    AND (storage.foldername(name))[1] = 'archive'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to SELECT objects from archive folder within their company path
CREATE POLICY global_docs_archive_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'global_docs'
    AND (storage.foldername(name))[1] = 'archive'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to UPDATE objects in archive folder within their company path
CREATE POLICY global_docs_archive_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'global_docs'
    AND (storage.foldername(name))[1] = 'archive'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'global_docs'
    AND (storage.foldername(name))[1] = 'archive'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to DELETE objects from archive folder within their company path
CREATE POLICY global_docs_archive_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'global_docs'
    AND (storage.foldername(name))[1] = 'archive'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

