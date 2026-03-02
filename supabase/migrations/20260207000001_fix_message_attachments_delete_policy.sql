-- ============================================================================
-- Migration: Repair - Create DELETE policy for message_attachments
-- Description: Previous migration partially applied. This drops and recreates
--              all 3 policies cleanly with correct column names.
-- ============================================================================

-- Drop all policies (safe if they don't exist)
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;

-- Recreate all 3 policies with correct table/column names

-- Policy: Users can upload attachments to conversations they're in
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message_attachments'
  AND EXISTS (
    SELECT 1 FROM public.messaging_channel_members mcm
    WHERE mcm.channel_id = (storage.foldername(name))[1]::uuid
      AND mcm.profile_id = auth.uid()
      AND mcm.left_at IS NULL
  )
);

-- Policy: Users can view attachments from conversations they're in
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message_attachments'
  AND EXISTS (
    SELECT 1 FROM public.messaging_messages m
    JOIN public.messaging_channel_members mcm ON mcm.channel_id = m.channel_id
    WHERE m.file_url LIKE '%' || storage.objects.name
      AND mcm.profile_id = auth.uid()
      AND mcm.left_at IS NULL
  )
);

-- Policy: Users can delete their own uploaded attachments
CREATE POLICY "Users can delete own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message_attachments'
  AND EXISTS (
    SELECT 1 FROM public.messaging_messages m
    WHERE m.file_url LIKE '%' || storage.objects.name
      AND m.sender_profile_id = auth.uid()
  )
);
