-- Create storage bucket for SOP photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sop-photos',
  'sop-photos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for authenticated users to upload photos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload SOP photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sop-photos');

-- Grant permissions for authenticated users to view SOP photos
CREATE POLICY IF NOT EXISTS "Authenticated users can view SOP photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sop-photos');

-- Grant permissions for authenticated users to delete their own SOP photos
CREATE POLICY IF NOT EXISTS "Authenticated users can delete SOP photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sop-photos');

-- Grant all permissions to service_role (for admin operations)
CREATE POLICY IF NOT EXISTS "Service role has full access to SOP photos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'sop-photos');

