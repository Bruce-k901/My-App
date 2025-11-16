// Messaging system TypeScript types

export type ConversationType = 'direct' | 'group' | 'site' | 'team';
export type MessageType = 'text' | 'file' | 'image' | 'system' | 'location';
export type ParticipantRole = 'admin' | 'member';

export interface Conversation {
  id: string;
  company_id: string | null;
  site_id: string | null;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  archived_at: string | null;
  // Relations
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
  last_read_at: string | null;
  last_read_message_id: string | null;
  muted_until: string | null;
  notification_preferences: {
    mentions: boolean;
    all_messages: boolean;
  };
  // Relations
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  reply_to_id: string | null;
  content: string;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // Relations
  sender?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  reply_to?: Message | null;
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  read_by?: string[]; // Array of user IDs who read this message
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  // Relations
  user?: {
    id: string;
    full_name: string | null;
  };
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
  // Relations
  mentioned_user?: {
    id: string;
    full_name: string | null;
  };
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateConversationInput {
  type: ConversationType;
  name?: string;
  description?: string;
  company_id?: string;
  site_id?: string;
  participant_ids: string[];
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  reply_to_id?: string;
  message_type?: MessageType;
  file?: File;
}

