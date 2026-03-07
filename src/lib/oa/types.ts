/**
 * OA Service Layer — TypeScript interfaces
 */

// ---------------------------------------------------------------------------
// Message metadata
// ---------------------------------------------------------------------------

export type OAMessageType =
  | 'course_assignment'
  | 'task_reminder'
  | 'document_delivery'
  | 'system_alert'
  | 'welcome'
  | 'general';

export interface OAActionButton {
  label: string;
  href: string;
  style?: 'primary' | 'secondary';
}

export interface OAMessageMetadata {
  source: 'opsly_assistant';
  is_bot: true;
  sender_name: 'Opsly Assistant';
  messageType?: OAMessageType;
  actionButton?: OAActionButton;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Messaging params
// ---------------------------------------------------------------------------

export interface OASendDMParams {
  recipientProfileId: string;
  content: string;
  companyId: string;
  metadata?: Omit<Partial<OAMessageMetadata>, 'source' | 'is_bot' | 'sender_name'> & Record<string, unknown>;
  messageType?: 'text' | 'system';
}

export interface OASendChannelMessageParams {
  channelId: string;
  content: string;
  metadata?: Omit<Partial<OAMessageMetadata>, 'source' | 'is_bot' | 'sender_name'> & Record<string, unknown>;
  messageType?: 'text' | 'system';
}

// ---------------------------------------------------------------------------
// Task params
// ---------------------------------------------------------------------------

export interface OACreateTaskParams {
  companyId: string;
  siteId?: string | null;
  assignedToUserId: string;
  assignedToRole?: string;
  taskName: string;
  instructions?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  taskData?: Record<string, unknown>;
  expiresAt?: string | null;
}

// ---------------------------------------------------------------------------
// Notification / reminder params
// ---------------------------------------------------------------------------

export interface OACreateReminderParams {
  companyId: string;
  recipientUserId: string; // auth UUID
  title: string;
  message?: string;
  link?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface OASendNotificationParams {
  companyId: string;
  siteId?: string | null;
  recipientUserId?: string;
  recipientRole?: string;
  type: 'task' | 'alert' | 'reminder' | 'message' | 'system';
  title: string;
  message?: string;
  severity?: 'info' | 'warning' | 'critical';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  link?: string;
  metadata?: Record<string, unknown>;
}
