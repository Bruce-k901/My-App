-- Storage policies for reports bucket
-- Bucket should be set to public in Supabase dashboard for public download links.
-- API listing and writes remain company-scoped via RLS policies below.

-- Read/list within company via API (note: public download is handled by bucket setting)
CREATE POLICY reports_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Insert within company path
CREATE POLICY reports_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Update within company path
CREATE POLICY reports_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Delete within company path
CREATE POLICY reports_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );