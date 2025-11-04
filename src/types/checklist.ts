/**
 * Checklist System TypeScript Types
 * Matches DEV_BRIEF_Checklist_Database.md schema
 * 
 * These types will be imported from the auto-generated supabase.ts once migrations are applied.
 * For now, defining them manually based on the dev brief.
 */

// ============= TYPE ALIASES FROM SUPABASE =============
// TODO: Once migrations are applied, regenerate supabase.ts and update these imports

// Base types (will match Database['public']['Tables'] after migration)
export type TaskTemplate = {
  id: string
  company_id: string | null
  name: string
  slug: string
  description: string | null
  category: TaskCategory
  audit_category: string | null
  frequency: TaskFrequency
  recurrence_pattern: Record<string, any> | null
  time_of_day: string | null
  dayparts: string[]
  assigned_to_role: string | null
  assigned_to_user_id: string | null
  site_id: string | null
  asset_id: string | null
  asset_type: string | null
  instructions: string | null
  repeatable_field_name: string | null
  evidence_types: string[]
  requires_sop: boolean
  requires_risk_assessment: boolean
  linked_sop_id: string | null
  linked_risk_id: string | null
  compliance_standard: string | null
  is_critical: boolean
  triggers_contractor_on_failure: boolean
  contractor_type: string | null
  is_active: boolean
  is_template_library: boolean
  created_at: string
  updated_at: string
}

export type TaskTemplateInsert = Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at'>
export type TaskTemplateUpdate = Partial<TaskTemplateInsert>

export type ChecklistTask = {
  id: string
  template_id: string | null // Nullable for callout follow-up tasks
  company_id: string
  site_id: string
  due_date: string
  due_time: string | null
  daypart: string | null
  assigned_to_role: string | null
  assigned_to_user_id: string | null
  status: TaskStatus
  priority: TaskPriority
  completed_at: string | null
  completed_by: string | null
  completion_notes: string | null
  flagged: boolean
  flag_reason: string | null
  escalated: boolean
  escalated_to: string | null
  escalation_reason: string | null
  contractor_notify_on_fail: boolean
  contractor_type: string | null
  contractor_notified_at: string | null
  callout_id: string | null // Reference to callout for follow-up tasks
  custom_name: string | null // Custom name if different from template
  custom_instructions: string | null // Custom instructions if different from template
  task_data: Record<string, any> | null // Instance-specific task data (checklist items, temperatures, etc.)
  generated_at: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type ChecklistTaskInsert = Omit<ChecklistTask, 'id' | 'created_at' | 'updated_at' | 'generated_at'>
export type ChecklistTaskUpdate = Partial<ChecklistTaskInsert>

export type TaskCompletionRecord = {
  id: string
  task_id: string
  template_id: string
  company_id: string
  site_id: string
  completed_by: string
  completed_at: string
  duration_seconds: number | null
  completion_data: Record<string, any>
  evidence_attachments: string[]
  flagged: boolean
  flag_reason: string | null
  sop_acknowledged: boolean
  risk_acknowledged: boolean
  created_at: string
}

export type TaskCompletionRecordInsert = Omit<TaskCompletionRecord, 'id' | 'created_at'>

export type TemplateField = {
  id: string
  template_id: string
  field_name: string
  field_type: FieldType
  label: string
  placeholder: string | null
  required: boolean
  min_value: number | null
  max_value: number | null
  warn_threshold: number | null
  fail_threshold: number | null
  options: Record<string, any> | null
  field_order: number
  help_text: string | null
  created_at: string
}

export type TemplateFieldInsert = Omit<TemplateField, 'id' | 'created_at'>

export type TemplateRepeatableLabel = {
  id: string
  template_id: string
  label: string
  label_value: string | null
  is_default: boolean
  display_order: number
  created_at: string
}

export type TemplateRepeatableLabelInsert = Omit<TemplateRepeatableLabel, 'id' | 'created_at'>

export type ContractorCallout = {
  id: string
  company_id: string
  site_id: string
  triggered_by_task_id: string | null
  triggered_by_template_id: string
  contractor_type: ContractorType
  contractor_id: string | null
  issue_description: string
  priority: ContractorCalloutPriority
  requested_date: string
  status: ContractorCalloutStatus
  scheduled_date: string | null
  completed_at: string | null
  contractor_notes: string | null
  completion_photos: string[]
  invoice_reference: string | null
  created_at: string
  updated_at: string
}

export type ContractorCalloutInsert = Omit<ContractorCallout, 'id' | 'created_at' | 'updated_at'>
export type ContractorCalloutUpdate = Partial<ContractorCalloutInsert>

// ============= ENUMS (For stricter type checking) =============

export enum TaskCategory {
  FOOD_SAFETY = 'food_safety',
  HEALTH_AND_SAFETY = 'h_and_s',
  FIRE = 'fire',
  CLEANING = 'cleaning',
  COMPLIANCE = 'compliance'
}

export enum TaskFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  TRIGGERED = 'triggered',
  ONCE = 'once'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
  OVERDUE = 'overdue'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  REPEATABLE_RECORD = 'repeatable_record',
  PHOTO = 'photo',
  PASS_FAIL = 'pass_fail',
  SIGNATURE = 'signature',
  DATE = 'date',
  TIME = 'time'
}

export enum ContractorType {
  PEST_CONTROL = 'pest_control',
  FIRE_ENGINEER = 'fire_engineer',
  EQUIPMENT_REPAIR = 'equipment_repair',
  HVAC = 'hvac',
  PLUMBING = 'plumbing'
}

export enum AuditCategory {
  FOOD_SAFETY = 'food_safety',
  ALLERGEN = 'allergen',
  HEALTH_AND_SAFETY = 'h_and_s',
  FIRE = 'fire',
  CLEANLINESS = 'cleanliness',
  COMPLIANCE = 'compliance',
  MAINTENANCE = 'maintenance'
}

export enum ContractorCalloutPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EMERGENCY = 'emergency'
}

export enum ContractorCalloutStatus {
  REQUESTED = 'requested',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// ============= CUSTOM INTERFACES =============

/**
 * Full template with all related data (fields, labels, asset info)
 * Used when displaying template details or editing
 */
export interface TemplateWithDetails extends TaskTemplate {
  fields: TemplateField[]
  repeatable_labels?: TemplateRepeatableLabel[]
  asset?: {
    id: string
    name: string
    type: string
  }
  sop?: {
    id: string
    title: string
  }
  risk?: {
    id: string
    title: string
  }
}

/**
 * A task ready to be displayed in the daily checklist
 * Includes template info, assignment info, and current status
 */
export interface ChecklistTaskWithTemplate extends ChecklistTask {
  template: TaskTemplate & {
    fields: TemplateField[]
    repeatable_labels?: TemplateRepeatableLabel[]
  }
  assigned_user?: {
    id: string
    email: string
    full_name: string
  }
  completed_by_user?: {
    id: string
    full_name: string
  }
}

/**
 * Grouped tasks by daypart for the daily view
 * Example: { before_open: [...], during_service: [...], after_service: [...] }
 */
export interface TasksByDaypart {
  [daypart: string]: ChecklistTaskWithTemplate[]
}

/**
 * Task completion with validation
 * Used when submitting a completed task
 */
export interface TaskCompletionPayload {
  task_id: string
  completion_data: Record<string, any> // Field values: { fridge_checks: [...], initials: 'JB' }
  evidence_attachments?: string[] // File URLs from Supabase storage
  duration_seconds?: number
  flagged?: boolean
  flag_reason?: string
}

/**
 * Response when completing a task
 */
export interface TaskCompletionResponse {
  success: boolean
  message: string
  completion_record?: TaskCompletionRecord
  contractor_callout_created?: ContractorCallout
}

/**
 * Compliance score for reporting
 */
export interface ComplianceScore {
  template_id: string
  template_name: string
  category: AuditCategory
  total_tasks: number
  completed_tasks: number
  completion_rate: number // 0-100
  overdue_count: number
  failed_count: number
  last_completion?: string // ISO date
}

/**
 * Daily summary for a site
 */
export interface DailySiteSummary {
  site_id: string
  site_name: string
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  failed_tasks: number
  completion_rate: number // 0-100
  by_category: {
    [key in AuditCategory]?: ComplianceScore
  }
}

/**
 * Template library item for browsing/searching
 */
export interface TemplateLibraryItem {
  id: string
  name: string
  slug: string
  category: TaskCategory
  frequency: TaskFrequency
  compliance_standard: string
  is_critical: boolean
  field_count: number
  description?: string
}

/**
 * Contractor call-out with full context
 */
export interface ContractorCalloutWithContext extends ContractorCallout {
  contractor?: {
    id: string
    name: string
    email: string
    phone: string
  }
  triggered_by_template?: TaskTemplate
  triggered_by_task?: ChecklistTask
}

// ============= API RESPONSE TYPES =============

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// ============= FORM/COMPONENT PROP TYPES =============

/**
 * Props for TemplateForm component
 */
export interface TemplateFormProps {
  template?: TemplateWithDetails
  mode: 'create' | 'edit' | 'clone'
  companyId: string
  siteId?: string
  onSave: (template: TaskTemplateInsert) => Promise<void>
  onCancel: () => void
}

/**
 * Props for TaskCompletionModal component
 */
export interface TaskCompletionModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onComplete: (payload: TaskCompletionPayload) => Promise<void>
  onClose: () => void
}

/**
 * Props for DailyChecklistView component
 */
export interface DailyChecklistViewProps {
  siteId: string
  date: Date
  tasks: ChecklistTaskWithTemplate[]
  onTaskClick: (task: ChecklistTaskWithTemplate) => void
  onRefresh: () => Promise<void>
}

// ============= UTILITY TYPES =============

/**
 * Make certain fields required in a type
 * Usage: RequireFields<TaskTemplate, 'completed_at' | 'completed_by'>
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make all fields of a type optional
 * Usage: Partial<TaskTemplate>
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null }

/**
 * Extract keys of a type that have a specific value type
 * Usage: KeysOfType<TaskTemplate, string>
 */
export type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T]

