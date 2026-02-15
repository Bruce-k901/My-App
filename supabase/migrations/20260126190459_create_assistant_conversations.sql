-- ============================================================================
-- Migration: Create Assistant Conversations System
-- Description: Creates assistant_conversations and assistant_messages tables
--              for multiple chat thread support
-- ============================================================================

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.assistant_messages CASCADE;
DROP TABLE IF EXISTS public.assistant_conversations CASCADE;

-- ============================================================================
-- TABLE: assistant_conversations
-- ============================================================================

CREATE TABLE public.assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user ON public.assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_company ON public.assistant_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated ON public.assistant_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_archived ON public.assistant_conversations(is_archived) WHERE is_archived = false;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assistant_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_conversations_updated_at();

-- RLS Policies
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only access their own conversations" ON public.assistant_conversations;

CREATE POLICY "Users can only access their own conversations"
  ON public.assistant_conversations FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- TABLE: assistant_messages
-- ============================================================================

CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation ON public.assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created ON public.assistant_messages(created_at);

-- RLS Policies
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only access messages in their conversations" ON public.assistant_messages;

CREATE POLICY "Users can only access messages in their conversations"
  ON public.assistant_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.assistant_conversations WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: Auto-update conversation updated_at when message is added
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assistant_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.assistant_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.assistant_conversations IS 'Chat conversation threads for Opsly Assistant';
COMMENT ON TABLE public.assistant_messages IS 'Individual messages within assistant conversations';
COMMENT ON COLUMN public.assistant_conversations.title IS 'Auto-generated title from first exchange';
