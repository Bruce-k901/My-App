// Types for the comprehensive EHO compliance report

export interface SiteInfo {
  id: string
  name: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  company_id: string | null
}

export interface CompanyInfo {
  id: string
  name: string | null
  legal_name: string | null
  address_line1: string | null
  city: string | null
  postcode: string | null
  contact_email: string | null
  phone: string | null
}

export interface ComplianceSummaryRow {
  category: string
  total_tasks: number
  completed_tasks: number
  missed_tasks: number
  completion_rate: number
  average_completion_time_seconds: number | null
  flagged_completions: number
}

export interface TaskCompletionRow {
  completion_id: string
  task_id: string
  template_id: string
  template_name: string
  template_category: string
  template_slug: string
  completed_at: string
  completed_by_name: string
  completed_by_role: string | null
  due_date: string | null
  due_time: string | null
  daypart: string | null
  completion_data: Record<string, any> | null
  evidence_attachments: string[] | null
  flagged: boolean
  flag_reason: string | null
  duration_seconds: number | null
}

export interface TemperatureRecord {
  recorded_at: string
  asset_name: string
  asset_type: string | null
  reading: number
  unit: string
  status: string
  recorded_by_name: string
  evaluation: Record<string, any> | null
}

export interface CleaningRecord {
  completion_id: string
  template_name: string
  completed_at: string
  completed_by_name: string
  completion_data: Record<string, any> | null
  due_date: string | null
  daypart: string | null
}

export interface PestControlRecord {
  completion_id: string
  completed_at: string
  completed_by_name: string
  assessment_result: string | null
  findings: string | null
  actions_taken: string | null
  completion_data: Record<string, any> | null
}

export interface TrainingRecord {
  staff_id: string
  staff_name: string
  training_type: string
  completed_at: string | null
  expiry_date: string | null
  certificate_number: string | null
  provider: string | null
}

export interface IncidentRecord {
  id: string
  title: string | null
  description: string | null
  incident_type: string
  severity: string
  incident_date: string
  reported_date: string | null
  reported_by: string | null
  location: string | null
  riddor_reportable: boolean | null
  riddor_reported: boolean | null
  riddor_reference: string | null
  status: string
  immediate_actions_taken: string | null
  corrective_actions: string | null
  investigation_notes: string | null
  root_cause: string | null
  casualties: any[] | null
  emergency_services_called: boolean | null
  photos: string[] | null
}

export interface OpeningClosingRecord {
  completion_id: string
  checklist_type: string
  completed_at: string
  completed_by_name: string
  completion_data: Record<string, any> | null
  daypart: string | null
}

export interface GlobalDocument {
  id: string
  name: string
  category: string
  version: string | null
  uploaded_at: string | null
  expiry_date: string | null
  is_active: boolean | null
  notes: string | null
  file_path: string
}

export interface CoshhDataSheet {
  id: string
  product_name: string
  manufacturer: string | null
  hazard_types: string[] | null
  document_type: string | null
  issue_date: string | null
  expiry_date: string | null
  status: string | null
  verification_status: string | null
  file_url: string
}

export interface RiskAssessment {
  id: string
  title: string
  ref_code: string
  template_type: string
  assessor_name: string | null
  assessment_date: string | null
  next_review_date: string | null
  status: string | null
  total_hazards: number | null
  hazards_controlled: number | null
  highest_risk_level: string | null
  linked_chemicals: string[] | null
  linked_ppe: string[] | null
}

export interface AssetRecord {
  id: string
  name: string
  category: string | null
  brand: string | null
  model: string | null
  serial_number: string | null
  status: string | null
  install_date: string | null
  last_service_date: string | null
  next_service_date: string | null
  warranty_end: string | null
  ppm_status: string | null
  ppm_frequency_months: number | null
}

export interface PatAppliance {
  id: string
  name: string
  brand: string | null
  has_current_pat_label: boolean
  purchase_date: string | null
  notes: string | null
}

export interface ComplianceScoreRecord {
  id: string
  score: number
  score_date: string
  open_critical_incidents: number
  overdue_corrective_actions: number
  missed_daily_checklists: number
  temperature_breaches_last_7d: number
  breakdown: Record<string, any>
}

export interface StaffProfile {
  id: string
  full_name: string | null
  app_role: string | null
  position_title: string | null
  food_safety_level: string | null
  food_safety_expiry_date: string | null
  h_and_s_level: string | null
  h_and_s_expiry_date: string | null
  fire_marshal_trained: boolean | null
  fire_marshal_expiry_date: string | null
  first_aid_trained: boolean | null
  first_aid_expiry_date: string | null
  cossh_trained: boolean | null
  cossh_expiry_date: string | null
}

export interface ContractorCallout {
  id: string
  contractor_type: string
  issue_description: string | null
  priority: string | null
  status: string | null
  requested_date: string | null
  scheduled_date: string | null
  completed_at: string | null
  contractor_notes: string | null
}

export interface EHOReportData {
  site: SiteInfo
  company: CompanyInfo | null
  startDate: string
  endDate: string

  // RPC data
  complianceSummary: ComplianceSummaryRow[]
  taskCompletions: TaskCompletionRow[]
  temperatureRecords: TemperatureRecord[]
  cleaningRecords: CleaningRecord[]
  pestControlRecords: PestControlRecord[]
  trainingRecords: TrainingRecord[]
  incidentReports: IncidentRecord[]
  openingClosingChecklists: OpeningClosingRecord[]

  // Direct table queries
  globalDocuments: GlobalDocument[]
  coshhDataSheets: CoshhDataSheet[]
  riskAssessments: RiskAssessment[]
  assets: AssetRecord[]
  patAppliances: PatAppliance[]
  complianceScores: ComplianceScoreRecord[]
  staffProfiles: StaffProfile[]
  contractorCallouts: ContractorCallout[]
}
