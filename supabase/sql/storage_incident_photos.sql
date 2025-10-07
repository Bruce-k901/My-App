-- Storage policies for incident_photos bucket

-- Allow authenticated users to SELECT objects in their company path
CREATE POLICY incident_photos_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'incident_photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to INSERT objects into their company path
CREATE POLICY incident_photos_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'incident_photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Allow authenticated users to UPDATE (upsert) objects within their company path
CREATE POLICY incident_photos_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'incident_photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'incident_photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );

-- Optional: Allow authenticated users to DELETE objects in their company path
CREATE POLICY incident_photos_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'incident_photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND split_part(storage.objects.name, '/', 1) = p.company_id::text
    )
  );