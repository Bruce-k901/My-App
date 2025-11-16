-- ============================================================================
-- Migration: Create Messaging System
-- Description: Full-featured messaging system with conversations, messages, 
--              read receipts, reactions, and typing indicators
-- Features: Direct messages, group chats, file attachments, read receipts,
--           message reactions, typing indicators, mentions
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'site', 'team')) DEFAULT 'direct',
  name TEXT, -- For group chats (optional for direct messages)
  description TEXT, -- Optional description for group chats
  avatar_url TEXT, -- Optional avatar URL for group chats
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ, -- For sorting conversations by most recent activity
  archived_at TIMESTAMPTZ, -- Soft delete for archived conversations
  CONSTRAINT conversations_company_check CHECK (
    (type IN ('direct', 'group', 'team') AND company_id IS NOT NULL) OR
    (type = 'site' AND site_id IS NOT NULL)
  )
);

-- ============================================================================
-- 2. CONVERSATION PARTICIPANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member', -- For group chat admins
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ, -- When user left the conversation
  last_read_at TIMESTAMPTZ, -- Last time user read messages in this conversation
  last_read_message_id UUID, -- Last message ID the user read
  muted_until TIMESTAMPTZ, -- Mute notifications until this time
  notification_preferences JSONB DEFAULT '{"mentions": true, "all_messages": true}'::jsonb,
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT participants_active_check CHECK (left_at IS NULL OR left_at > joined_at)
);

-- ============================================================================
-- 3. MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL, -- For threaded replies
  content TEXT NOT NULL, -- Message text content
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'file', 'image', 'system', 'location')) DEFAULT 'text',
  file_url TEXT, -- For file/image attachments (stored in Supabase Storage)
  file_name TEXT, -- Original filename
  file_size INTEGER, -- File size in bytes
  file_type TEXT, -- MIME type
  metadata JSONB DEFAULT '{}'::jsonb, -- For additional data (location coords, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ, -- When message was edited
  deleted_at TIMESTAMPTZ, -- Soft delete
  CONSTRAINT messages_content_check CHECK (
    (message_type IN ('text', 'system') AND content IS NOT NULL) OR
    (message_type IN ('file', 'image', 'location') AND file_url IS NOT NULL)
  )
);

-- ============================================================================
-- 4. MESSAGE READS TABLE (Read Receipts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- ============================================================================
-- 5. MESSAGE REACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL, -- Emoji character (e.g., '👍', '❤️', '😂')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji) -- One user can only react once with same emoji
);

-- ============================================================================
-- 6. MESSAGE MENTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id) -- Prevent duplicate mentions
);

-- ============================================================================
-- 7. TYPING INDICATORS TABLE (for real-time typing status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON public.conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_site_id ON public.conversations(site_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_archived_at ON public.conversations(archived_at) WHERE archived_at IS NULL;

-- Conversation participants indexes
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_last_read_at ON public.conversation_participants(conversation_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_active ON public.conversation_participants(conversation_id, user_id) WHERE left_at IS NULL;

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

-- Message reads indexes
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON public.message_reads(read_at DESC);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Message mentions indexes
CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON public.message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user_id ON public.message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_created_at ON public.message_mentions(mentioned_user_id, created_at DESC);

-- Typing indicators indexes
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_updated_at ON public.typing_indicators(updated_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Drop functions if they exist (for idempotency)
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.update_message_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_direct_conversation_participants() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_typing_indicators() CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_company_match(UUID, UUID) CASCADE;

-- Function to update conversation's updated_at and last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW(),
      last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
DROP TRIGGER IF EXISTS trigger_update_message_timestamp ON public.messages;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Function to update message updated_at
CREATE OR REPLACE FUNCTION public.update_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update message updated_at
CREATE TRIGGER trigger_update_message_timestamp
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_message_timestamp();

-- Function to auto-create direct conversation participants
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation_participants()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INTEGER;
BEGIN
  -- Only for direct conversations
  IF NEW.type = 'direct' THEN
    -- Count existing participants
    SELECT COUNT(*) INTO participant_count
    FROM public.conversation_participants
    WHERE conversation_id = NEW.id;
    
    -- This should be handled by application logic, but adding as safety
    IF participant_count < 2 THEN
      RAISE EXCEPTION 'Direct conversations must have exactly 2 participants';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old typing indicators (older than 30 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is a conversation participant (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = user_uuid
      AND left_at IS NULL
  );
END;
$$;

-- Function to check if user belongs to company (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.check_user_company_match(user_uuid UUID, comp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- If company_id is NULL, allow
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Allow if company matches or user has no company set
  RETURN (user_company_id IS NULL OR user_company_id = comp_id);
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_company ON public.conversations;
DROP POLICY IF EXISTS conversations_update_creator_or_admin ON public.conversations;

-- Users can view conversations they are participants in
CREATE POLICY conversations_select_participant
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      JOIN public.profiles p ON p.id = cp.user_id
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can create conversations in their company
-- Use security definer function to bypass RLS on profiles
CREATE POLICY conversations_insert_company
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_company_match(auth.uid(), company_id)
  );

-- Users can update conversations they created or are admins of
CREATE POLICY conversations_update_creator_or_admin
  ON public.conversations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
        AND cp.left_at IS NULL
    )
  );

-- ============================================================================
-- CONVERSATION PARTICIPANTS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS participants_select_conversation_member ON public.conversation_participants;
DROP POLICY IF EXISTS participants_insert_company ON public.conversation_participants;
DROP POLICY IF EXISTS participants_update_own ON public.conversation_participants;

-- Users can view participants of conversations they're in
-- Use security definer function to avoid infinite recursion
CREATE POLICY participants_select_conversation_member
  ON public.conversation_participants
  FOR SELECT
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Users can add themselves to conversations in their company
CREATE POLICY participants_insert_company
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE c.id = conversation_participants.conversation_id
        AND (
          (c.company_id IS NOT NULL AND p.company_id = c.company_id) OR
          (c.site_id IS NOT NULL AND p.site_id = c.site_id)
        )
    )
  );

-- Users can update their own participant record
CREATE POLICY participants_update_own
  ON public.conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MESSAGES RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS messages_select_participant ON public.messages;
DROP POLICY IF EXISTS messages_insert_participant ON public.messages;
DROP POLICY IF EXISTS messages_update_sender ON public.messages;
DROP POLICY IF EXISTS messages_delete_sender ON public.messages;

-- Users can view messages in conversations they're participants in
CREATE POLICY messages_select_participant
  ON public.messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can send messages to conversations they're participants in
CREATE POLICY messages_insert_participant
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can update their own messages
CREATE POLICY messages_update_sender
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can soft-delete their own messages
CREATE POLICY messages_delete_sender
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() AND deleted_at IS NOT NULL);

-- ============================================================================
-- MESSAGE READS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS message_reads_select_participant ON public.message_reads;
DROP POLICY IF EXISTS message_reads_insert_own ON public.message_reads;

-- Users can view read receipts for messages in their conversations
CREATE POLICY message_reads_select_participant
  ON public.message_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can mark messages as read
CREATE POLICY message_reads_insert_own
  ON public.message_reads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- ============================================================================
-- MESSAGE REACTIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS message_reactions_select_participant ON public.message_reactions;
DROP POLICY IF EXISTS message_reactions_insert_participant ON public.message_reactions;
DROP POLICY IF EXISTS message_reactions_delete_own ON public.message_reactions;

-- Users can view reactions on messages in their conversations
CREATE POLICY message_reactions_select_participant
  ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY message_reactions_insert_participant
  ON public.message_reactions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can remove their own reactions
CREATE POLICY message_reactions_delete_own
  ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- MESSAGE MENTIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS message_mentions_select_participant ON public.message_mentions;

-- Users can view mentions in their conversations
CREATE POLICY message_mentions_select_participant
  ON public.message_mentions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_mentions.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Mentions are created automatically when messages are inserted (handled by application)

-- ============================================================================
-- TYPING INDICATORS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS typing_indicators_select_participant ON public.typing_indicators;
DROP POLICY IF EXISTS typing_indicators_upsert_own ON public.typing_indicators;

-- Users can view typing indicators in their conversations
CREATE POLICY typing_indicators_select_participant
  ON public.typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Users can update their own typing status
CREATE POLICY typing_indicators_upsert_own
  ON public.typing_indicators
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = typing_indicators.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.conversations IS 'Chat conversations (direct messages, group chats, site-wide, team chats)';
COMMENT ON TABLE public.conversation_participants IS 'Users participating in conversations';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.message_reads IS 'Read receipts tracking which users have read which messages';
COMMENT ON TABLE public.message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE public.message_mentions IS 'User mentions (@username) in messages';
COMMENT ON TABLE public.typing_indicators IS 'Real-time typing status indicators';

COMMENT ON COLUMN public.conversations.type IS 'direct: 1-on-1, group: custom group, site: site-wide, team: team-based';
COMMENT ON COLUMN public.conversation_participants.role IS 'admin: can manage group, member: regular participant';
COMMENT ON COLUMN public.messages.reply_to_id IS 'For threaded replies to specific messages';
COMMENT ON COLUMN public.messages.message_type IS 'text: regular message, file: file attachment, image: image, system: system message, location: location share';

COMMIT;

