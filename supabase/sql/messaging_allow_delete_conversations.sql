-- Allow conversation creators to delete their conversations
-- Run this in Supabase SQL editor
BEGIN;

-- Ensure policy name uniqueness
DROP POLICY IF EXISTS conversations_delete_by_creator ON public.conversations;

-- Basic delete policy: creator can delete
CREATE POLICY conversations_delete_by_creator
  ON public.conversations
  FOR DELETE
  USING (created_by = auth.uid());

COMMIT;


