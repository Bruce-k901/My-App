// ============================================================================
// TASK COMPLETION TYPES
// Matches Edge Function task_data structure exactly
// ============================================================================

export type TaskSourceType =
  | 'temperature'
  | 'ppm_overdue'
  | 'ppm_service'
  | 'certificate_expiry'
  | 'certificate_no_expiry'
  | 'sop_review'
  | 'ra_review'
  | 'document_expiry'
  | 'callout_followup'
  | 'messaging_task'
  | 'monitoring'

export interface TaskDataBase {
  source_type?: TaskSourceType
  checklistItems?: string[]
  yesNoChecklistItems?: Array<{ text: string; answer: boolean | null }>
}

export interface TemperatureTaskData extends TaskDataBase {
  source_type?: 'temperature' | 'monitoring'
  selectedAssets: string[]
  temperatures: Array<{
    assetId: string
    temp: number | null
    nickname?: string | null
  }>
  equipment_config?: Array<{
    assetId: string
    asset_name?: string
    nickname?: string
    temp_min?: number | null
    temp_max?: number | null
  }>
  // Dynamic repeatable field (e.g., asset_name, equipment_name)
  [key: string]: any
}

export interface PPMTaskData extends TaskDataBase {
  source_type: 'ppm_overdue' | 'ppm_service'
  source_id: string // Asset ID
  next_service_date: string
  is_overdue: boolean
}

export interface CertificateTaskData extends TaskDataBase {
  source_type: 'certificate_expiry' | 'certificate_no_expiry'
  certificate_type: 'food_safety' | 'h_and_s' | 'fire_marshal' | 'first_aid' | 'cossh'
  profile_id: string
  expiry_date?: string
  days_until_expiry?: number
  level?: number
}

export interface DocumentTaskData extends TaskDataBase {
  source_type: 'document_expiry'
  document_id: string
  document_name: string
  document_category: string
  expiry_date: string
  days_until_expiry: number
}

export interface CalloutTaskData extends TaskDataBase {
  source_type: 'callout_followup'
  source_id: string // Callout ID
}

export interface SOPTaskData extends TaskDataBase {
  source_type: 'sop_review'
  sop_id: string
  review_date: string
  days_until_review: number
}

export interface RATaskData extends TaskDataBase {
  source_type: 'ra_review'
  ra_id: string
  review_date: string
  days_until_review: number
}

export type TaskData =
  | TemperatureTaskData
  | PPMTaskData
  | CertificateTaskData
  | DocumentTaskData
  | CalloutTaskData
  | SOPTaskData
  | RATaskData
  | TaskDataBase

export interface Asset {
  id: string
  name: string
  category: string
  site_id: string
  site_name?: string
  nickname?: string
  temperature_min?: number | null
  temperature_max?: number | null
}

export interface TemperatureRecord {
  asset_id: string
  temperature: number
  status: 'ok' | 'warning' | 'critical'
  recorded_at: string
  task_id: string
  company_id: string
  site_id: string
}

export interface OutOfRangeAsset {
  assetId: string
  assetName: string
  temperature: number
  min: number | null
  max: number | null
  action?: 'monitor' | 'callout'
  monitoringDuration?: number
  calloutNotes?: string
}

export interface TaskCompletionPayload {
  taskId: string
  status: 'completed'
  completedAt: string
  completedBy: string
  formData: Record<string, any>
  photos?: File[]
  temperatureRecords?: TemperatureRecord[]
  outOfRangeAssets?: OutOfRangeAsset[]
  equipmentList?: Array<{
    assetId: string
    assetName: string
    temperature?: number
    nickname?: string
  }>
}
