-- Cleanup and Fix COSHH Documents Storage Policies
-- This removes duplicate policies and ensures only the correct ones exist

-- Step 1: Remove all existing COSHH policies (including duplicates)
DROP POLICY IF EXISTS "Users can upload COSHH documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view COSHH documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update COSHH documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete COSHH documents from their company" ON storage.objects;

-- Remove any auto-generated duplicate policies (they have random suffixes)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%COSHH documents%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Create clean policies (one for each operation)

-- Allow authenticated users to upload files to their company folder
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

-- Step 3: Verify only the correct policies exist
SELECT 
  policyname, 
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%COSHH%'
ORDER BY policyname;

-- You should see exactly 4 policies:
-- 1. Users can delete COSHH documents from their company (DELETE)
-- 2. Users can update COSHH documents from their company (UPDATE)
-- 3. Users can upload COSHH documents for their company (INSERT)
-- 4. Users can view COSHH documents from their company (SELECT)



