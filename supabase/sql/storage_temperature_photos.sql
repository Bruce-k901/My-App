-- Storage policies for temperature_photos bucket

-- Ensure bucket exists (create separately in Supabase dashboard if needed)
-- Policies assume path structure: temperature_photos/{company_id}/{site_id}/{log_id}/{filename}

CREATE POLICY temperature_photos_select_company
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'temperature_photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (storage.objects.name LIKE CONCAT(p.company_id::text, '/%') OR storage.objects.name LIKE CONCAT('temperature_photos/', p.company_id::text, '/%'))
    )
  );

CREATE POLICY temperature_photos_insert_company
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'temperature_photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          storage.objects.name LIKE CONCAT('temperature_photos/', p.company_id::text, '/%') OR
          storage.objects.name LIKE CONCAT(p.company_id::text, '/%')
        )
    )
  );

CREATE POLICY temperature_photos_update_company
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'temperature_photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (storage.objects.name LIKE CONCAT('temperature_photos/', p.company_id::text, '/%') OR storage.objects.name LIKE CONCAT(p.company_id::text, '/%'))
    )
  );

CREATE POLICY temperature_photos_delete_company
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'temperature_photos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (storage.objects.name LIKE CONCAT('temperature_photos/', p.company_id::text, '/%') OR storage.objects.name LIKE CONCAT(p.company_id::text, '/%'))
    )
  );