// ============================================================================
// SUPPORT TICKETS - TYPE DEFINITIONS
// ============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketType = 'issue' | 'idea' | 'question';
export type TicketModule =
  | 'checkly'
  | 'stockly'
  | 'teamly'
  | 'planly'
  | 'assetly'
  | 'msgly'
  | 'general';

export type TicketChangeType = 'status' | 'priority' | 'assignment' | 'created';

// ============================================================================
// MAIN TICKET INTERFACE
// ============================================================================

export interface SupportTicket {
  id: string;
  company_id: string;
  site_id: string | null;
  created_by: string;
  assigned_to: string | null;
  type: TicketType;
  module: TicketModule;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  page_url: string | null;
  created_at: string;
  updated_at: string;

  // Activity tracking (from new migration)
  last_comment_at: string | null;
  comment_count: number;
  last_status_change_at: string | null;
  last_status_change_by: string | null;
}

// ============================================================================
// TICKET WITH RELATIONS (for detail view)
// ============================================================================

export interface SupportTicketWithRelations extends SupportTicket {
  created_by_profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  assigned_to_profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  company: {
    name: string;
  } | null;
  site: {
    name: string;
  } | null;
  attachments: TicketAttachment[];
  comments: TicketComment[];
  history: TicketHistoryEntry[];
  unread_count?: number;
}

// ============================================================================
// TICKET COMMENT
// ============================================================================

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;

  // Relations
  author?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  attachments?: TicketAttachment[];
}

// ============================================================================
// TICKET ATTACHMENT
// ============================================================================

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id: string | null; // null = initial ticket attachment
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

// ============================================================================
// TICKET NOTIFICATION
// ============================================================================

export interface TicketNotification {
  id: string;
  ticket_id: string;
  user_id: string;
  last_read_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TICKET HISTORY
// ============================================================================

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  changed_by: string;
  change_type: TicketChangeType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;

  // Relations
  changed_by_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

// ============================================================================
// TICKET LIST ITEM (for efficient list rendering)
// ============================================================================

export interface TicketListItem {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  module: TicketModule;
  created_at: string;
  updated_at: string;
  last_comment_at: string | null;
  comment_count: number;
  created_by_name: string;
  assigned_to_name: string | null;
  company_name: string;
  unread_count: number;
  has_attachments: boolean;
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  type?: TicketType[];
  module?: TicketModule[];
  assignedTo?: string[];
  createdBy?: string[];
  companyId?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TicketSortOptions {
  field: 'created_at' | 'updated_at' | 'last_comment_at' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateTicketCommentRequest {
  content: string;
  is_internal?: boolean;
  attachments?: File[];
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
}

export interface TicketListResponse {
  tickets: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface TicketStatsResponse {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  high_priority: number;
  urgent_priority: number;
  by_module: Record<TicketModule, number>;
  by_type: Record<TicketType, number>;
  avg_response_time_hours: number | null;
  avg_resolution_time_hours: number | null;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkTicketOperation {
  ticketIds: string[];
  operation: 'update_status' | 'update_priority' | 'assign' | 'close';
  value: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TicketFormData {
  type: TicketType;
  module: TicketModule;
  title: string;
  description: string;
  priority: TicketPriority;
  attachments?: File[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface TicketBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export type TicketStatusConfig = Record<TicketStatus, TicketBadgeConfig>;
export type TicketPriorityConfig = Record<TicketPriority, TicketBadgeConfig>;
export type TicketModuleConfig = Record<TicketModule, TicketBadgeConfig>;
export type TicketTypeConfig = Record<TicketType, TicketBadgeConfig>;
