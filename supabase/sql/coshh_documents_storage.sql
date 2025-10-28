-- Create COSHH Documents Storage Bucket
-- This migration creates the coshh-documents storage bucket for COSHH data sheets

-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coshh-documents',
  'coshh-documents',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for COSHH Documents Storage

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Users can upload COSHH documents for their company" ON storage.objects;
CREATE POLICY "Users can upload COSHH documents for their company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coshh-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
    WHERE id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

-- Allow authenticated users to view files from their company
DROP POLICY IF EXISTS "Users can view COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can view COSHH documents from their company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'coshh-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
    WHERE id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

-- Allow authenticated users to update files from their company
DROP POLICY IF EXISTS "Users can update COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can update COSHH documents from their company"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coshh-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
    WHERE id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

-- Allow authenticated users to delete files from their company
DROP POLICY IF EXISTS "Users can delete COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can delete COSHH documents from their company"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'coshh-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
    WHERE id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

