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
  yesNoChecklistItems?: Array<{ text: string; answer: 'yes' | 'no' | null }>;

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
  | 'asset_selection';

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
