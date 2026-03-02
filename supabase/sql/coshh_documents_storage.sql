-- Create COSHH Documents Storage Bucket
-- This migration creates the coshh-documents storage bucket for COSHH data sheets
-- Run this in Supabase SQL Editor

-- Step 1: Check if bucket already exists
SELECT * FROM storage.buckets WHERE id = 'coshh-documents';

-- Step 2: Create the bucket (if it doesn't exist)
-- Note: If the INSERT fails, you may need to create the bucket manually in the Supabase dashboard
-- Go to Storage > Create bucket > Name: coshh-documents > Public: NO > File size: 10MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coshh-documents',
  'coshh-documents',
  false, -- Private bucket (authenticated access only)
  10485760, -- 10MB limit (10 * 1024 * 1024)
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'coshh-documents';

-- Step 3: Create RLS Policies for COSHH Documents Storage
-- These policies ensure users can only access files from their own company

-- Allow authenticated users to upload files to their company folder
DROP POLICY IF EXISTS "Users can upload COSHH documents for their company" ON storage.objects;
CREATE POLICY "Users can upload COSHH documents for their company"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'coshh-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);

-- Allow authenticated users to view files from their company
DROP POLICY IF EXISTS "Users can view COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can view COSHH documents from their company"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'coshh-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);

-- Allow authenticated users to update files from their company
DROP POLICY IF EXISTS "Users can update COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can update COSHH documents from their company"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'coshh-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
)
WITH CHECK (
  bucket_id = 'coshh-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);

-- Allow authenticated users to delete files from their company
DROP POLICY IF EXISTS "Users can delete COSHH documents from their company" ON storage.objects;
CREATE POLICY "Users can delete COSHH documents from their company"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'coshh-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND split_part(storage.objects.name, '/', 1) = p.company_id::text
  )
);

-- Step 4: Verify policies were created
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage' 
-- AND tablename = 'objects'
-- AND policyname LIKE '%COSHH%';

