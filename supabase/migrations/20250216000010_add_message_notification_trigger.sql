-- ============================================================================
-- Migration: Message Notification Trigger
-- Description: Automatically create notifications when messages are received
-- ============================================================================

BEGIN;

-- Function to notify conversation participants when a new message arrives
CREATE OR REPLACE FUNCTION public.notify_message_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_conversation RECORD;
  v_message_preview TEXT;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Prepare message preview (truncate if too long)
  v_message_preview := CASE
    WHEN NEW.message_type = 'image' THEN '📷 Photo'
    WHEN NEW.message_type = 'file' THEN '📎 ' || COALESCE(NEW.file_name, 'File')
    ELSE LEFT(NEW.content, 100)
  END;

  -- Notify all participants except the sender
  FOR v_participant IN
    SELECT user_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND left_at IS NULL
  LOOP
    -- Create notification for this participant
    PERFORM public.create_message_notification(
      NEW.conversation_id,
      NEW.id,
      NEW.sender_id,
      v_participant.user_id,
      v_conversation.company_id,
      v_message_preview
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS trg_notify_message_recipients ON public.messages;
CREATE TRIGGER trg_notify_message_recipients
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.notify_message_recipients();

COMMIT;

