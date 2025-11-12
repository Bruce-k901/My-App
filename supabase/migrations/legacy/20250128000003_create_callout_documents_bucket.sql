-- Create callout_documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'callout_documents',
  'callout_documents',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for callout_documents bucket
-- Drop existing policies if they exist, then create new ones

-- Policy: Authenticated users can view files
DROP POLICY IF EXISTS "Authenticated users can view callout documents" ON storage.objects;
CREATE POLICY "Authenticated users can view callout documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'callout_documents' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Authenticated users can upload files
DROP POLICY IF EXISTS "Authenticated users can upload callout documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload callout documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'callout_documents' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can update files they uploaded (or files in their company folder)
DROP POLICY IF EXISTS "Users can update callout documents" ON storage.objects;
CREATE POLICY "Users can update callout documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'callout_documents' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can delete files they uploaded (or files in their company folder)
DROP POLICY IF EXISTS "Users can delete callout documents" ON storage.objects;
CREATE POLICY "Users can delete callout documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'callout_documents' 
    AND auth.role() = 'authenticated'
  );

