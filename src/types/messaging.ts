// Messaging system TypeScript types

export type ConversationType = "direct" | "group" | "site" | "team";
export type MessageType = "text" | "file" | "image" | "system" | "location";
export type ParticipantRole = "admin" | "member";
export type TopicCategory =
  | "safety"
  | "maintenance"
  | "operations"
  | "hr"
  | "compliance"
  | "incidents"
  | "general";
export type ContextType = "site" | "asset" | "task" | "team" | "general";

export interface Conversation {
  id: string;
  company_id: string | null;
  channel_type?: "site" | "asset" | "contractor" | "team" | ConversationType; // New schema field
  type?: ConversationType; // Backward compatibility
  entity_type?: string; // New field (maps to context_type)
  entity_id?: string; // New field (maps to context_id)
  site_id?: string | null; // Backward compatibility
  name: string | null;
  description?: string | null;
  avatar_url?: string | null;
  created_by?: string | null;
  is_auto_created?: boolean; // New field
  created_at: string;
  updated_at?: string;
  last_message_at?: string | null;
  archived_at?: string | null;
  // Zenzap-style enhancements
  topic?: string | null;
  topic_category?: TopicCategory | null;
  is_pinned?: boolean;
  context_type?: ContextType | null;
  context_id?: string | null;
  // Relations
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  channel_id?: string; // New schema field
  conversation_id?: string; // Backward compatibility
  user_id: string;
  member_role?: ParticipantRole; // New schema field
  role?: ParticipantRole; // Backward compatibility
  joined_at: string;
  left_at?: string | null;
  last_read_at?: string | null;
  last_read_message_id?: string | null;
  muted_until?: string | null;
  unread_count?: number; // New field
  notification_preferences?: {
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
  channel_id: string; // New schema field
  conversation_id?: string; // Backward compatibility
  sender_id: string;
  sender_name?: string; // New field
  parent_message_id?: string | null; // New schema field (replaces reply_to_id)
  reply_to_id?: string | null; // Backward compatibility
  content: string;
  message_type: MessageType;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>; // New structure
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  // Task conversion fields
  is_task?: boolean;
  task_id?: string | null;
  is_system?: boolean;
  // Workflow integration fields (stored in metadata)
  action_suggested?: boolean;
  action_taken?: boolean;
  action_type?: string;
  action_entity_id?: string;
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
  delivered_to?: string[]; // Array of user IDs who received this message
  // Receipt status (for UI display)
  receipt_status?: "sent" | "delivered" | "read"; // Status for own messages
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
  channel_id: string;
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
  // Zenzap-style enhancements
  topic?: string;
  topic_category?: TopicCategory;
  context_type?: ContextType;
  context_id?: string;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
  reply_to_id?: string;
  message_type?: MessageType;
  file?: File;
}

// Filter interface for topic-based filtering
export interface ConversationFilters {
  topicCategory?: TopicCategory;
  isPinned?: boolean;
  contextType?: ContextType;
  contextId?: string;
}

// Task conversion input
export interface ConvertToTaskInput {
  messageId: string;
  title: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  priority: "low" | "medium" | "high";
  site_id?: string;
  asset_id?: string;
}
