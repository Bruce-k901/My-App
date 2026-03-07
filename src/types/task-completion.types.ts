// ============================================================================
// TASK COMPLETION TYPES - Matches Edge Function contract exactly
// ============================================================================

export type TaskSourceType =
  | 'temperature'
  | 'monitoring'
  | 'ppm_overdue'
  | 'ppm_service'
  | 'certificate_expiry'
  | 'certificate_no_expiry'
  | 'sop_review'
  | 'ra_review'
  | 'document_expiry'
  | 'callout_followup'
  | 'messaging_task';

// Base structure for all task_data
export interface TaskDataBase {
  source_type?: TaskSourceType;

  // Checklist features
  checklistItems?: Array<string | { text: string; completed: boolean }>;
  yesNoChecklistItems?: YesNoChecklistItem[];

  // Asset selection
  selectedAssets?: string[];

  // Temperature feature
  temperatures?: Array<{
    assetId: string;
    temp: number | null;
    nickname?: string | null;
    temp_min?: number;
    temp_max?: number;
  }>;

  // Equipment config (from site_checklist)
  equipment_config?: Array<{
    assetId: string;
    asset_name?: string;
    nickname?: string;
    temp_min?: number | null;
    temp_max?: number | null;
  }>;

  // Custom form builder fields
  custom_field_values?: Record<string, any>;
  custom_records?: Record<string, any>[];

  // Reference documents from template (SOPs, RAs, guides)
  referenceDocuments?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;

  // Dynamic repeatable fields (e.g., asset_name, fridge_name)
  [key: string]: any;
}

// Template evidence types (features)
export type EvidenceType =
  | 'temperature'
  | 'photo'
  | 'checklist'
  | 'yes_no_checklist'
  | 'pass_fail'
  | 'signature'
  | 'document'
  | 'asset_selection'
  | 'custom_fields';

export interface ComplianceTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'annually' | 'triggered' | 'once';
  evidence_types: EvidenceType[];
  repeatable_field_name?: string;
  fields?: TemplateField[];
  recurrence_pattern?: {
    default_checklist_items?: Array<string | { text: string }>;
    daypart_times?: Record<string, string | string[]>;
  };
  instructions?: string;
  dayparts?: string[];
}

export interface TemplateField {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'time';
  required: boolean;
  options?: any[];
  help_text?: string;
  min_value?: number;
  max_value?: number;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  site_id: string;
  site_name?: string;
  nickname?: string;
  temperature_min?: number | null;
  temperature_max?: number | null;
}

export interface ChecklistTask {
  id: string;
  template_id: string;
  site_checklist_id?: string;
  company_id: string;
  site_id: string;
  custom_name?: string;
  custom_instructions?: string;
  template_notes?: string;
  due_date: string;
  due_time?: string;
  daypart?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  task_data: TaskDataBase;
  template?: ComplianceTemplate;
  completed_by?: string;
  flagged?: boolean;
  flag_reason?: string;
}

// Enabled features detected from template
export interface EnabledFeatures {
  checklist: boolean;
  yesNoChecklist: boolean;
  temperature: boolean;
  photoEvidence: boolean;
  passFailChecks: boolean;
  assetSelection: boolean;
  documentUpload: boolean;
  signature: boolean;
  customFields: boolean;
}

// Custom field value stored in completion data
export interface CustomFieldValue {
  field_id: string;
  field_name: string;
  field_type: string;
  label: string;
  value: any;
  unit?: string | null;
}

// Out of range asset
export interface OutOfRangeAsset {
  assetId: string;
  assetName: string;
  temperature: number;
  min: number | null;
  max: number | null;
  action?: 'monitor' | 'callout';
  monitoringDuration?: number;
  calloutNotes?: string;
}

// ============================================================================
// YES/NO CHECKLIST - ENHANCED TYPES
// ============================================================================

/** Per-option action configuration (configured in template builder) */
export interface YesNoOptionAction {
  logException?: boolean;
  requestAction?: boolean;
  requireAction?: boolean;
  message?: string;
  logicJump?: number | null; // Deferred — data model only
}

/** A single option within a yes/no question (Yes, No, N/A, or custom) */
export interface YesNoOption {
  label: string;    // Display label: "Yes", "No", "N/A", etc.
  value: string;    // Lowercase key: "yes", "no", "na", etc.
  actions?: YesNoOptionAction;
}

/** Enhanced yes/no checklist item with per-option actions */
export interface YesNoChecklistItemEnhanced {
  text: string;
  options: YesNoOption[];
  answer: string | null;
  actionResponse?: string;       // Runtime: user's documented action
  exceptionLogged?: boolean;     // Runtime: was exception flagged
}

/** Legacy yes/no checklist item (backward-compatible) */
export interface YesNoChecklistItemLegacy {
  text: string;
  answer: 'yes' | 'no' | null;
}

/** Union type for backward compatibility */
export type YesNoChecklistItem = YesNoChecklistItemLegacy | YesNoChecklistItemEnhanced;

/** Type guard to distinguish enhanced from legacy format */
export function isEnhancedYesNoItem(
  item: any
): item is YesNoChecklistItemEnhanced {
  return item && 'options' in item && Array.isArray(item.options);
}

/** Normalize any yes/no item to enhanced format */
export function normalizeYesNoItem(item: any): YesNoChecklistItemEnhanced {
  if (isEnhancedYesNoItem(item)) return item;
  return {
    text: typeof item === 'string' ? item : (item?.text || ''),
    options: [
      { label: 'Yes', value: 'yes', actions: {} },
      { label: 'No', value: 'no', actions: {} },
    ],
    answer: item?.answer || null,
  };
}

// Task completion payload
export interface TaskCompletionPayload {
  taskId: string;
  status: 'completed';
  completedAt: string;
  completedBy: string;
  formData: Record<string, any>;
  photos?: File[];
  temperatureRecords?: Array<{
    asset_id: string;
    temperature: number;
    status: 'ok' | 'warning' | 'critical';
    recorded_at: string;
    task_id: string;
    company_id: string;
    site_id: string;
  }>;
  outOfRangeAssets?: OutOfRangeAsset[];
  equipmentList?: Array<{
    assetId: string;
    assetName: string;
    temperature?: number;
    nickname?: string;
  }>;
}
