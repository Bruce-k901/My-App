-- ============================================================================
-- Migration: Fix Storage Policies for message_attachments bucket
-- Description: Storage policies referenced old table names (conversation_participants, messages)
--              which no longer exist. Updates to use messaging_channel_members and messaging_messages.
-- ============================================================================

-- Drop old policies that reference non-existent tables
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message_attachments',
  'message_attachments',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

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
