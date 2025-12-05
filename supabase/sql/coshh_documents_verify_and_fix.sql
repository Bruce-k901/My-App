-- COSHH Documents Bucket - Verify and Fix Policies
-- Run this to check bucket status and set up policies

-- Step 1: Verify bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'coshh-documents';

-- If the above query returns a row, the bucket exists and we can proceed with policies
-- If it returns no rows, create the bucket manually in the dashboard first

-- Step 2: Create/Update RLS Policies for COSHH Documents Storage
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

-- Step 3: Verify policies were created
SELECT 
  policyname, 
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%COSHH%'
ORDER BY policyname;


