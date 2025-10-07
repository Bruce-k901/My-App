-- Storage policies for company_logos bucket

-- Set bucket 'company_logos' to public in Supabase dashboard to allow public URLs.
-- API access remains company-scoped via RLS policies below.

CREATE POLICY company_logos_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'company_logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

CREATE POLICY company_logos_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company_logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

CREATE POLICY company_logos_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'company_logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'company_logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

CREATE POLICY company_logos_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'company_logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );