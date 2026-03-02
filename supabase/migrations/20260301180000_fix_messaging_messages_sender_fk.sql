-- ============================================================================
-- Migration: Fix messaging_messages sender FK to reference profiles
-- ============================================================================
-- The FK messaging_messages_sender_id_fkey currently references auth.users(id).
-- OA (Opsly Assistant) is a system profile that exists in profiles but NOT in
-- auth.users, so it cannot send messages. This migration changes the FK to
-- reference profiles(id) instead, matching the identity standardization pattern.
-- ============================================================================

-- Drop the old FK that references auth.users
ALTER TABLE public.messaging_messages
  DROP CONSTRAINT IF EXISTS messaging_messages_sender_id_fkey;

-- Recreate FK to reference profiles(id)
ALTER TABLE public.messaging_messages
  ADD CONSTRAINT messaging_messages_sender_profile_id_fkey
  FOREIGN KEY (sender_profile_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
