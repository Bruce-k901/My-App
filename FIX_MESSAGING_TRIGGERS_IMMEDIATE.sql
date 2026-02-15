-- ============================================================================
-- IMMEDIATE FIX: Fix Trigger Functions for messaging_messages
-- Description: Update trigger functions to use profile_id/sender_profile_id instead of user_id/sender_id
-- Run this directly in Supabase SQL Editor
-- ============================================================================

-- Step 1: Fix notify_message_recipients function if it exists
-- This function might be triggered on messaging_messages INSERT
CREATE OR REPLACE FUNCTION public.notify_message_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_participant RECORD;
  v_conversation RECORD;
  v_message_preview TEXT;
  v_sender_id UUID;
  v_channel_id UUID;
BEGIN
  -- Handle both messaging_messages (channel_id) and messages (conversation_id)
  IF TG_TABLE_NAME = 'messaging_messages' THEN
    -- For messaging_messages, use channel_id and sender_profile_id
    v_channel_id := NEW.channel_id;
    v_sender_id := NEW.sender_profile_id;
    
    -- Get channel details (messaging_channels doesn't have company_id in the same way)
    -- We'll need to get it from channel members
    SELECT mc.company_id INTO v_conversation
    FROM public.messaging_channels mc
    WHERE mc.id = NEW.channel_id
    LIMIT 1;
    
  ELSIF TG_TABLE_NAME = 'messages' THEN
    -- For old messages table, use conversation_id and sender_profile_id (or sender_id for backward compat)
    v_channel_id := NEW.conversation_id;
    v_sender_id := COALESCE(NEW.sender_profile_id, NEW.sender_id);
    
    -- Get conversation details
    SELECT company_id INTO v_conversation
    FROM public.conversations
    WHERE id = NEW.conversation_id;
  ELSE
    RETURN NEW;
  END IF;

  IF NOT FOUND OR v_conversation.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prepare message preview (truncate if too long)
  v_message_preview := CASE
    WHEN NEW.message_type = 'image' THEN '📷 Photo'
    WHEN NEW.message_type = 'file' THEN '📎 ' || COALESCE(NEW.file_name, 'File')
    ELSE LEFT(NEW.content, 100)
  END;

  -- Notify all participants except the sender
  -- For messaging_messages, use messaging_channel_members
  IF TG_TABLE_NAME = 'messaging_messages' THEN
    FOR v_participant IN
      SELECT profile_id
      FROM public.messaging_channel_members
      WHERE channel_id = NEW.channel_id
        AND profile_id != COALESCE(NEW.sender_profile_id, NEW.sender_id)
        AND left_at IS NULL
    LOOP
      -- Create notification for this participant (if function exists)
      IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_message_notification' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ) THEN
        PERFORM public.create_message_notification(
          NEW.channel_id::text, -- conversation_id (using channel_id as identifier)
          NEW.id,
          v_sender_id,
          v_participant.profile_id,
          v_conversation.company_id,
          v_message_preview
        );
      END IF;
    END LOOP;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    -- For old messages table, use conversation_participants
    FOR v_participant IN
      SELECT COALESCE(profile_id, user_id) as participant_id
      FROM public.conversation_participants
      WHERE conversation_id = NEW.conversation_id
        AND COALESCE(profile_id, user_id) != v_sender_id
        AND left_at IS NULL
    LOOP
      IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_message_notification' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ) THEN
        PERFORM public.create_message_notification(
          NEW.conversation_id::text,
          NEW.id,
          v_sender_id,
          v_participant.participant_id,
          v_conversation.company_id,
          v_message_preview
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 2: Check if there's a trigger on messaging_messages and update/drop it if needed
-- The trigger function above will handle both tables, but we need to make sure the trigger exists
DO $$
BEGIN
  -- Check if trigger exists on messaging_messages
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_notify_message_recipients' 
    AND tgrelid = 'messaging_messages'::regclass
  ) THEN
    -- Trigger already exists on messaging_messages, keep it
    RAISE NOTICE 'Trigger trg_notify_message_recipients already exists on messaging_messages';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messaging_messages'
  ) THEN
    -- Create trigger on messaging_messages if table exists
    DROP TRIGGER IF EXISTS trg_notify_message_recipients ON public.messaging_messages;
    CREATE TRIGGER trg_notify_message_recipients
      AFTER INSERT ON public.messaging_messages
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NULL)
      EXECUTE FUNCTION public.notify_message_recipients();
    RAISE NOTICE 'Created trigger trg_notify_message_recipients on messaging_messages';
  END IF;
END $$;

-- Step 3: Fix the is_conversation_participant function if it references user_id
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND (profile_id = user_uuid OR user_id = user_uuid) -- Handle both column names
      AND left_at IS NULL
  );
END;
$function$;

-- Verify triggers
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'messaging_messages'::regclass
  AND tgname NOT LIKE 'RI_%' -- Exclude foreign key triggers
ORDER BY tgname;
