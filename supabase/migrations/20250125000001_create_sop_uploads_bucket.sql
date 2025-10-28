-- Create sop_uploads storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop_uploads',
  'sop_uploads',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sop_uploads bucket
-- Policy: Anyone can view files (public bucket)
CREATE POLICY "Anyone can view SOP uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'sop_uploads');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload SOP files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sop_uploads' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their own SOP uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'sop_uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own SOP uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'sop_uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
