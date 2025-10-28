-- Manual bucket creation script
-- Run this in Supabase SQL Editor

-- Step 1: Check if bucket already exists
SELECT * FROM storage.buckets WHERE id = 'sop-photos';

-- Step 2: If no results, create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop-photos',
  'sop-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Step 3: Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'sop-photos';

-- Step 4: Create policies (only if they don't exist)
-- Policy for authenticated users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload SOP photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload SOP photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'sop-photos');
  END IF;
END $$;

-- Policy for authenticated users to view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can view SOP photos'
  ) THEN
    CREATE POLICY "Authenticated users can view SOP photos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'sop-photos');
  END IF;
END $$;

-- Policy for authenticated users to delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete SOP photos'
  ) THEN
    CREATE POLICY "Authenticated users can delete SOP photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'sop-photos');
  END IF;
END $$;

-- Verify all policies were created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%SOP photos%';

