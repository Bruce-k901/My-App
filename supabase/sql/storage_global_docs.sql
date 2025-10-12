-- Storage policies for global_docs bucket
-- Set bucket 'global_docs' to public in Supabase dashboard to allow public URLs.
-- API access remains company-scoped via RLS policies below.

-- Allow authenticated users to SELECT objects in their company path
CREATE POLICY IF NOT EXISTS global_docs_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'global_docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to INSERT objects into their company path
CREATE POLICY IF NOT EXISTS global_docs_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'global_docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to UPDATE (upsert) objects within their company path
CREATE POLICY IF NOT EXISTS global_docs_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'global_docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'global_docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Optional: allow authenticated users to DELETE objects in their company path
CREATE POLICY IF NOT EXISTS global_docs_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'global_docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );