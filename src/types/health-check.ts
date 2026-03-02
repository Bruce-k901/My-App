// Health Check System Types

export type Severity = 'critical' | 'medium' | 'low'

export type HealthCheckModule = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly'

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'relationship' | 'boolean' | 'json'

export type ReportLevel = 'site' | 'area' | 'region' | 'company'

export type ReportStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export type ItemStatus = 'pending' | 'in_progress' | 'delegated' | 'resolved' | 'ignored' | 'escalated' | 'ai_fixed'

export type ReminderType = 'initial' | 'follow_up' | 'escalation_warning' | 'escalated'

// ---------- DB Row Types ----------

export interface HealthCheckReport {
  id: string
  company_id: string
  report_level: ReportLevel
  site_id: string | null
  area_id: string | null
  region_id: string | null
  assigned_to: string
  assigned_role: string
  total_items: number
  critical_count: number
  medium_count: number
  low_count: number
  completed_items: number
  delegated_items: number
  escalated_items: number
  ignored_items: number
  health_score: number | null
  previous_week_score: number | null
  status: ReportStatus
  calendar_task_id: string | null
  is_test_data: boolean
  created_at: string
  completed_at: string | null
  last_viewed_at: string | null
}

export interface HealthCheckItem {
  id: string
  report_id: string
  company_id: string
  site_id: string | null
  severity: Severity
  module: HealthCheckModule
  category: string
  title: string
  description: string
  table_name: string
  record_id: string
  record_name: string | null
  field_name: string
  field_label: string | null
  field_type: FieldType
  current_value: unknown
  field_options: unknown
  field_metadata: unknown
  ai_suggestion: unknown
  ai_confidence: number | null
  ai_reasoning: string | null
  status: ItemStatus
  delegated_to: string | null
  delegated_at: string | null
  delegated_by: string | null
  delegation_message: string | null
  due_date: string | null
  conversation_id: string | null
  last_reminder_sent: string | null
  reminder_count: number
  next_reminder_at: string | null
  escalated_to: string | null
  escalated_at: string | null
  escalation_reason: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolution_method: string | null
  new_value: unknown
  edit_url: string | null
  is_test_data: boolean
  created_at: string
  updated_at: string
}

export interface HealthCheckReminder {
  id: string
  health_check_item_id: string
  reminder_type: ReminderType
  scheduled_for: string
  sent_at: string | null
  sent_to: string
  notification_channels: string[]
  message_content: string | null
  created_at: string
}

export interface HealthCheckHistory {
  id: string
  company_id: string
  site_id: string | null
  report_date: string
  total_items: number
  critical_count: number
  medium_count: number
  low_count: number
  completed_items: number
  health_score: number
  module_scores: Record<string, number> | null
  category_counts: Record<string, number> | null
  created_at: string
}

// ---------- Rule Definition Types ----------

export interface ScanRuleDefinition {
  id: string
  module: HealthCheckModule
  category: string
  severity: Severity
  title: string
  description: string
  table_name: string
  field_name: string
  field_label: string
  field_type: FieldType
  field_options?: unknown
  field_metadata?: unknown
}

export interface ScannedItem {
  rule: ScanRuleDefinition
  record_id: string
  record_name: string
  site_id: string
  current_value: unknown
}

// ---------- API Types ----------

export interface ReportWithItems extends HealthCheckReport {
  items: HealthCheckItem[]
  site?: { id: string; name: string }
  assigned_profile?: { id: string; full_name: string; app_role: string }
}

export interface ItemUpdatePayload {
  status?: ItemStatus
  new_value?: unknown
  resolution_method?: string
}

export interface DelegatePayload {
  item_id: string
  delegated_to: string
  message: string
  due_date?: string
}

export interface ScanResult {
  company_id: string
  site_id: string
  site_name: string
  items: ScannedItem[]
  stats: {
    total: number
    critical: number
    medium: number
    low: number
  }
  scan_errors: string[]
}

export interface GenerationResult {
  reports_created: number
  items_created: number
  calendar_tasks_created: number
  errors: string[]
  scan_errors: string[]
}
