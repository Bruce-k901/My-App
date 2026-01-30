// Teamly-specific type extensions
// These extend the base Supabase types
//
// Usage:
// - Profile type in src/types/index.ts already extends ProfileHRExtension
// - Use Profile type for employee profiles: import { Profile } from '@/types'
// - Use EmployeeDocument for document records
// - Use CompanyHRSettings and SiteSchedulingSettings for settings

export interface ProfileHRExtension {
  // Personal
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country?: string | null;
  emergency_contacts?: EmergencyContact[] | null;
  
  // Employment
  employee_number?: string | null;
  start_date?: string | null;
  probation_end_date?: string | null;
  contract_type?: ContractType | null;
  contracted_hours?: number | null;
  hourly_rate?: number | null;
  salary?: number | null;
  pay_frequency?: PayFrequency | null;
  department?: string | null;
  reports_to?: string | null;
  notice_period_weeks?: number | null;
  
  // Compliance
  national_insurance_number?: string | null;
  right_to_work_status?: RightToWorkStatus | null;
  right_to_work_expiry?: string | null;
  right_to_work_document_type?: string | null;
  dbs_status?: DBSStatus | null;
  dbs_certificate_number?: string | null;
  dbs_check_date?: string | null;
  dbs_update_service_registered?: boolean | null;
  
  // Banking
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_sort_code?: string | null;
  
  // Leave
  annual_leave_allowance?: number | null;
  leave_year_start?: string | null;
  leave_calculation_method?: LeaveCalculationMethod | null;
  
  // Offboarding
  termination_date?: string | null;
  termination_reason?: TerminationReason | null;
  exit_interview_completed?: boolean | null;
  eligible_for_rehire?: boolean | null;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export type ContractType = 
  | 'permanent' 
  | 'fixed_term' 
  | 'zero_hours' 
  | 'casual' 
  | 'agency' 
  | 'contractor' 
  | 'apprentice';

export type PayFrequency = 
  | 'weekly' 
  | 'fortnightly' 
  | 'four_weekly' 
  | 'monthly';

export type RightToWorkStatus = 
  | 'verified' 
  | 'pending' 
  | 'expired' 
  | 'not_required';

export type DBSStatus = 
  | 'clear' 
  | 'pending' 
  | 'not_required' 
  | 'issues_found';

export type LeaveCalculationMethod = 
  | 'days' 
  | 'hours' 
  | 'accrual';

export type TerminationReason = 
  | 'resigned' 
  | 'dismissed' 
  | 'redundancy' 
  | 'end_of_contract' 
  | 'retired' 
  | 'mutual_agreement' 
  | 'other';

// Employee Documents
export interface EmployeeDocument {
  id: string;
  company_id: string;
  profile_id: string;
  document_type: DocumentType;
  title: string;
  description?: string | null;
  file_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  is_current: boolean;
  version: number;
  requires_signature: boolean;
  signed_at?: string | null;
  signed_by?: string | null;
  verification_status: VerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  is_confidential: boolean;
  visible_to_employee: boolean;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type DocumentType = 
  | 'contract' 
  | 'right_to_work' 
  | 'dbs_certificate' 
  | 'id_document'
  | 'passport'
  | 'visa'
  | 'qualification' 
  | 'training_certificate' 
  | 'policy_acknowledgement'
  | 'disciplinary'
  | 'performance_review'
  | 'sick_note'
  | 'reference'
  | 'other';

export type VerificationStatus = 
  | 'pending' 
  | 'verified' 
  | 'rejected' 
  | 'expired';

// Company HR Settings Extension
export interface CompanyHRSettings {
  holiday_year_start_month?: number;
  holiday_year_start_day?: number;
  use_anniversary_leave_year?: boolean;
  default_leave_allowance?: number;
  bank_holidays_included?: boolean;
  max_leave_carry_over?: number;
  carry_over_deadline_months?: number;
  working_time_rules?: WorkingTimeRules;
  overtime_rules?: OvertimeRules;
  default_probation_weeks?: number;
  payroll_frequency?: PayFrequency;
  payroll_cutoff_day?: number;
  uk_region?: UKRegion;
  pension_provider?: string;
  pension_employee_contribution?: number;
  pension_employer_contribution?: number;
}

export interface WorkingTimeRules {
  max_weekly_hours: number;
  opted_out_of_48_hour_limit: boolean;
  min_daily_rest_hours: number;
  min_weekly_rest_hours: number;
  max_night_shift_hours: number;
  break_after_hours: number;
  break_duration_minutes: number;
}

export interface OvertimeRules {
  overtime_threshold_weekly: number;
  overtime_rate_multiplier: number;
  weekend_rate_multiplier: number;
  bank_holiday_rate_multiplier: number;
  track_overtime: boolean;
}

export type UKRegion = 
  | 'england' 
  | 'scotland' 
  | 'wales' 
  | 'northern_ireland';

// Site Scheduling Extension
export interface SiteSchedulingSettings {
  operating_hours?: OperatingHours;
  is_operational?: boolean;
  timezone?: string;
  staffing_requirements?: StaffingRequirements;
  has_break_room?: boolean;
  max_staff_on_site?: number;
  has_blackout_dates?: boolean;
}

export interface OperatingHours {
  [day: string]: {
    open: string;  // HH:MM format
    close: string; // HH:MM format
    closed: boolean;
  };
}

export interface StaffingRequirements {
  [daypart: string]: {
    min: number;
    ideal: number;
    roles: { [role: string]: number };
  };
}

// =====================================================
// LEAVE MANAGEMENT TYPES
// =====================================================

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description?: string | null;
  is_paid: boolean;
  requires_approval: boolean;
  deducts_from_allowance: boolean;
  allow_half_days: boolean;
  allow_negative_balance: boolean;
  min_notice_days: number;
  max_consecutive_days?: number | null;
  is_accrual_based: boolean;
  accrual_rate?: number | null;
  allow_carry_over: boolean;
  max_carry_over_days?: number | null;
  carry_over_expiry_months?: number | null;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type LeaveRequestStatus = 
  | 'pending' 
  | 'approved' 
  | 'declined' 
  | 'cancelled' 
  | 'taken';

export interface LeaveRequest {
  id: string;
  company_id: string;
  profile_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  start_half_day: boolean;
  end_half_day: boolean;
  total_days: number;
  status: LeaveRequestStatus;
  reason?: string | null;
  requested_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  decline_reason?: string | null;
  employee_notes?: string | null;
  manager_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  company_id: string;
  profile_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  carried_over: number;
  adjustments: number;
  taken_days: number;
  pending_days: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceView extends LeaveBalance {
  remaining_days: number;
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  deducts_from_allowance: boolean;
  full_name: string;
  email?: string | null;
}

export interface LeaveRequestView extends LeaveRequest {
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  employee_name: string;
  employee_email?: string | null;
  employee_avatar?: string | null;
  home_site?: string | null;
  reviewer_name?: string | null;
}

export interface LeaveCalendarEvent {
  id: string;
  company_id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: LeaveRequestStatus;
  leave_type_name: string;
  color: string;
  full_name: string;
  avatar_url?: string | null;
  home_site?: string | null;
  site_name?: string | null;
}

export interface PublicHoliday {
  id: string;
  company_id?: string | null;
  name: string;
  date: string;
  year: number;
  region: string;
  is_paid: boolean;
  created_at: string;
}

export interface LeaveBlackoutDate {
  id: string;
  company_id: string;
  site_id?: string | null;
  name: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  applies_to_roles?: string[] | null;
  allow_manager_override: boolean;
  is_recurring: boolean;
  created_by?: string | null;
  created_at: string;
}

// =====================================================
// SCHEDULING & ROTA TYPES
// =====================================================

export interface ShiftPattern {
  id: string;
  company_id: string;
  site_id?: string | null;
  name: string;
  short_code?: string | null;
  description?: string | null;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  paid_break_minutes: number;
  total_hours: number;
  is_premium: boolean;
  premium_rate_multiplier: number;
  min_staff: number;
  max_staff?: number | null;
  requires_role?: string[] | null;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ScheduledShiftStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'no_show' 
  | 'cancelled';

export interface ScheduledShift {
  id: string;
  company_id: string;
  site_id: string;
  profile_id: string;
  shift_pattern_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  scheduled_hours?: number | null;
  role?: string | null;
  section?: string | null;
  status: ScheduledShiftStatus;
  is_published: boolean;
  published_at?: string | null;
  published_by?: string | null;
  confirmed_at?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  actual_hours?: number | null;
  notes?: string | null;
  manager_notes?: string | null;
  is_premium: boolean;
  premium_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RotaView extends ScheduledShift {
  site_name: string;
  pattern_name?: string | null;
  pattern_color?: string | null;
  pattern_code?: string | null;
}

export interface StaffAvailability {
  id?: string;
  company_id: string;
  profile_id: string;
  availability_type: AvailabilityType;
  day_of_week?: number | null;
  specific_date?: string | null;
  is_available: boolean;
  available_from?: string | null;
  available_to?: string | null;
  is_preferred: boolean;
  max_hours?: number | null;
  notes?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  created_at: string;
  updated_at: string;
}

export type AvailabilityType = 
  | 'recurring' 
  | 'specific' 
  | 'exception';

export interface ShiftSwapRequest {
  id: string;
  company_id: string;
  original_shift_id: string;
  requesting_profile_id: string;
  swap_type: SwapType;
  target_profile_id?: string | null;
  target_shift_id?: string | null;
  is_open: boolean;
  status: SwapRequestStatus;
  responded_by?: string | null;
  responded_at?: string | null;
  requires_manager_approval: boolean;
  manager_approved?: boolean | null;
  approved_by?: string | null;
  approved_at?: string | null;
  reason?: string | null;
  response_notes?: string | null;
  manager_notes?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type SwapType = 
  | 'swap' 
  | 'giveaway' 
  | 'cover';

export type SwapRequestStatus = 
  | 'pending' 
  | 'accepted' 
  | 'declined' 
  | 'cancelled' 
  | 'expired' 
  | 'manager_pending' 
  | 'approved';

export interface StaffingRequirement {
  id: string;
  company_id: string;
  site_id: string;
  day_of_week: number;
  time_slot_start: string;
  time_slot_end: string;
  minimum_staff: number;
  ideal_staff?: number | null;
  maximum_staff?: number | null;
  role_requirements?: Record<string, number> | null;
  effective_from?: string | null;
  effective_to?: string | null;
  created_at: string;
}

// =====================================================
// TRAINING & CERTIFICATIONS TYPES
// =====================================================

export interface TrainingCourse {
  id: string;
  company_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  category: string;
  course_type: CourseType;
  provider?: string | null;
  provider_url?: string | null;
  duration_minutes?: number | null;
  results_in_certification: boolean;
  certification_name?: string | null;
  certification_validity_months?: number | null;
  is_mandatory: boolean;
  mandatory_for_roles?: string[] | null;
  mandatory_for_sites?: string[] | null;
  prerequisite_course_id?: string | null;
  renewal_required: boolean;
  renewal_period_months?: number | null;
  renewal_reminder_days: number;
  content_url?: string | null;
  assessment_required: boolean;
  pass_mark_percentage: number;
  is_active: boolean;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CourseType = 
  | 'internal' 
  | 'external' 
  | 'online' 
  | 'certification';

export type TrainingRecordStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'expired' 
  | 'failed';

export interface TrainingRecord {
  id: string;
  company_id: string;
  profile_id: string;
  course_id: string;
  status: TrainingRecordStatus;
  started_at?: string | null;
  completed_at?: string | null;
  score_percentage?: number | null;
  passed?: boolean | null;
  attempts: number;
  certificate_number?: string | null;
  certificate_url?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  renewal_reminder_sent: boolean;
  renewal_reminder_sent_at?: string | null;
  verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  trainer_name?: string | null;
  training_location?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecordView extends TrainingRecord {
  employee_name: string;
  employee_email?: string | null;
  employee_avatar?: string | null;
  position_title?: string | null;
  home_site?: string | null;
  site_name?: string | null;
  course_name: string;
  course_code?: string | null;
  course_category: string;
  course_type: CourseType;
  is_mandatory: boolean;
  certification_name?: string | null;
  renewal_required: boolean;
  renewal_reminder_days: number;
  validity_status?: 'expired' | 'expiring_soon' | 'valid' | null;
  days_until_expiry?: number | null;
}

export interface ComplianceMatrixEntry {
  profile_id: string;
  company_id: string;
  full_name: string;
  email?: string | null;
  avatar_url?: string | null;
  position_title?: string | null;
  app_role?: string | null;
  home_site?: string | null;
  site_name?: string | null;
  course_id: string;
  course_name: string;
  course_code?: string | null;
  category: string;
  is_mandatory: boolean;
  mandatory_for_roles?: string[] | null;
  training_status: string;
  completed_at?: string | null;
  expiry_date?: string | null;
  compliance_status: 'compliant' | 'expired' | 'in_progress' | 'required' | 'optional';
}

export interface TrainingStats {
  company_id: string;
  course_id: string;
  course_name: string;
  course_code?: string | null;
  category: string;
  is_mandatory: boolean;
  total_employees: number;
  completed_valid: number;
  expired: number;
  in_progress: number;
  expiring_30_days: number;
  compliance_percentage?: number | null;
}

export interface CompanyTrainingOverview {
  company_id: string;
  total_employees: number;
  fully_compliant: number;
  expiring_30_days: number;
  expired_count: number;
}

// =====================================================
// PERFORMANCE REVIEWS & 1:1s TYPES
// =====================================================

export interface ReviewCycle {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  cycle_type: CycleType;
  start_date: string;
  end_date: string;
  review_window_start?: string | null;
  review_window_end?: string | null;
  status: CycleStatus;
  include_self_assessment: boolean;
  include_manager_assessment: boolean;
  include_peer_feedback: boolean;
  include_goals: boolean;
  template_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CycleType = 
  | 'annual' 
  | 'semi_annual' 
  | 'quarterly' 
  | 'probation' 
  | 'project' 
  | 'ad_hoc';

export type CycleStatus = 
  | 'draft' 
  | 'active' 
  | 'in_review' 
  | 'completed' 
  | 'cancelled';

export interface ReviewTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  template_type: TemplateType;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

export type TemplateType = 
  | 'standard' 
  | 'probation' 
  | '360' 
  | 'project';

export interface ReviewTemplateSection {
  id: string;
  template_id: string;
  title: string;
  description?: string | null;
  section_type: SectionType;
  rating_scale: number;
  rating_labels?: Record<string, string> | null;
  completed_by: CompletedBy;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export type SectionType = 
  | 'rating' 
  | 'text' 
  | 'goals' 
  | 'competencies' 
  | 'values';

export type CompletedBy = 
  | 'employee' 
  | 'manager' 
  | 'both';

export interface ReviewTemplateQuestion {
  id: string;
  section_id: string;
  question_text: string;
  help_text?: string | null;
  question_type: QuestionType;
  options?: Record<string, any> | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export type QuestionType = 
  | 'rating' 
  | 'text' 
  | 'yes_no' 
  | 'multi_choice';

export interface PerformanceReview {
  id: string;
  company_id: string;
  cycle_id?: string | null;
  profile_id: string;
  reviewer_id: string;
  template_id?: string | null;
  status: ReviewStatus;
  due_date?: string | null;
  self_assessment_completed_at?: string | null;
  manager_review_completed_at?: string | null;
  discussion_date?: string | null;
  completed_at?: string | null;
  acknowledged_at?: string | null;
  overall_rating?: number | null;
  overall_rating_label?: string | null;
  promotion_recommended: boolean;
  salary_increase_recommended: boolean;
  pip_recommended: boolean;
  private_manager_notes?: string | null;
  employee_signature?: string | null;
  manager_signature?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 
  | 'not_started' 
  | 'self_assessment' 
  | 'manager_review' 
  | 'discussion' 
  | 'completed' 
  | 'acknowledged';

export interface ReviewResponse {
  id: string;
  review_id: string;
  question_id: string;
  responded_by: 'employee' | 'manager';
  rating_value?: number | null;
  text_value?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReviewView extends PerformanceReview {
  employee_name: string;
  employee_email?: string | null;
  employee_avatar?: string | null;
  position_title?: string | null;
  home_site?: string | null;
  site_name?: string | null;
  reviewer_name: string;
  cycle_name?: string | null;
  template_name?: string | null;
  progress_percentage: number;
}

export interface Goal {
  id: string;
  company_id: string;
  profile_id: string;
  review_id?: string | null;
  title: string;
  description?: string | null;
  goal_type: GoalType;
  measurable_target?: string | null;
  start_date: string;
  target_date?: string | null;
  completed_date?: string | null;
  progress_percentage: number;
  status: GoalStatus;
  priority: GoalPriority;
  weight_percentage: number;
  is_private: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalType = 
  | 'performance' 
  | 'development' 
  | 'project' 
  | 'behaviour' 
  | 'career';

export type GoalStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'deferred';

export type GoalPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'critical';

export interface GoalView extends Goal {
  employee_name: string;
  employee_avatar?: string | null;
  manager_name?: string | null;
  update_count: number;
  last_update_at?: string | null;
  display_status: string;
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  update_text: string;
  progress_percentage?: number | null;
  posted_by: string;
  created_at: string;
}

export interface OneOnOneMeeting {
  id: string;
  company_id: string;
  employee_id: string;
  manager_id: string;
  scheduled_date: string;
  scheduled_time?: string | null;
  duration_minutes: number;
  location?: string | null;
  meeting_link?: string | null;
  status: MeetingStatus;
  employee_agenda?: string | null;
  manager_agenda?: string | null;
  meeting_notes?: string | null;
  private_manager_notes?: string | null;
  action_items?: Array<{
    task: string;
    assignee: string;
    due_date: string;
    completed: boolean;
  }> | null;
  next_meeting_date?: string | null;
  is_recurring: boolean;
  recurrence_pattern?: string | null;
  parent_meeting_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type MeetingStatus = 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled' 
  | 'rescheduled' 
  | 'no_show';

export interface OneOnOneView extends OneOnOneMeeting {
  employee_name: string;
  employee_avatar?: string | null;
  position_title?: string | null;
  manager_name: string;
  manager_avatar?: string | null;
  talking_point_count: number;
  pending_topics: number;
}

export interface TalkingPoint {
  id: string;
  meeting_id: string;
  topic: string;
  notes?: string | null;
  added_by: 'employee' | 'manager';
  is_discussed: boolean;
  sort_order: number;
  created_at: string;
}

// =====================================================
// TIME & ATTENDANCE TYPES
// =====================================================

export interface TimeEntry {
  id: string;
  company_id: string;
  profile_id: string;
  site_id?: string | null;
  scheduled_shift_id?: string | null;
  entry_type: EntryType;
  clock_in: string;
  clock_out?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  total_break_minutes: number;
  gross_hours?: number | null;
  net_hours?: number | null;
  regular_hours?: number | null;
  overtime_hours?: number | null;
  status: TimeEntryStatus;
  clock_in_location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null;
  clock_out_location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null;
  location_verified: boolean;
  notes?: string | null;
  employee_notes?: string | null;
  manager_notes?: string | null;
  adjusted_by?: string | null;
  adjustment_reason?: string | null;
  original_clock_in?: string | null;
  original_clock_out?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type EntryType = 
  | 'shift' 
  | 'break' 
  | 'overtime' 
  | 'adjustment';

export type TimeEntryStatus = 
  | 'active' 
  | 'completed' 
  | 'approved' 
  | 'rejected' 
  | 'adjusted';

export interface TimeEntryView extends TimeEntry {
  work_date: string;
  employee_name: string;
  employee_email?: string | null;
  employee_avatar?: string | null;
  position_title?: string | null;
  site_name?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  was_late: boolean;
  left_early: boolean;
}

export interface ClockStatus {
  is_clocked_in: boolean;
  is_on_break: boolean;
  entry_id: string | null;
  clock_in_time: string | null;
  break_start_time: string | null;
  elapsed_hours: number;
  break_minutes: number;
}

export interface Timesheet {
  id: string;
  company_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  break_hours: number;
  days_worked: number;
  status: TimesheetStatus;
  submitted_at?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  employee_notes?: string | null;
  manager_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type TimesheetStatus = 
  | 'draft' 
  | 'submitted' 
  | 'approved' 
  | 'rejected' 
  | 'paid';

export interface TimesheetView extends Timesheet {
  employee_name: string;
  employee_email?: string | null;
  employee_avatar?: string | null;
  position_title?: string | null;
  home_site?: string | null;
  site_name?: string | null;
  approved_by_name?: string | null;
}

export interface DailyAttendance {
  profile_id: string;
  employee_name: string;
  position_title?: string | null;
  site_name?: string | null;
  status: string;
  clock_in?: string | null;
  clock_out?: string | null;
  hours_worked?: number | null;
  is_late: boolean;
  is_on_break: boolean;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

export interface WeeklyHours {
  profile_id: string;
  employee_name: string;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  sat_hours: number;
  sun_hours: number;
  total_hours: number;
  overtime_hours: number;
}

// =====================================================
// PAYROLL TYPES
// =====================================================

export type PayType = 'hourly' | 'salary' | 'daily';

export interface PayRate {
  id: string;
  company_id: string;
  profile_id: string;
  pay_type: PayType;
  base_rate: number; // In pence
  currency: string;
  overtime_rate?: number | null;
  overtime_multiplier: number;
  weekend_rate?: number | null;
  weekend_multiplier: number;
  bank_holiday_rate?: number | null;
  bank_holiday_multiplier: number;
  contracted_hours_per_week: number;
  effective_from: string;
  effective_to?: string | null;
  is_current: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type PayPeriodType = 'weekly' | 'biweekly' | 'monthly';

export type PayPeriodStatus = 'open' | 'processing' | 'approved' | 'paid' | 'closed';

export interface PayPeriod {
  id: string;
  company_id: string;
  period_type: PayPeriodType;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: PayPeriodStatus;
  total_gross: number; // In pence
  total_deductions: number; // In pence
  total_net: number; // In pence
  employee_count: number;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayPeriodView extends PayPeriod {
  total_gross_pounds: number;
  total_deductions_pounds: number;
  total_net_pounds: number;
  approved_by_name?: string | null;
}

export type PayslipStatus = 'draft' | 'calculated' | 'approved' | 'paid';

export interface Payslip {
  id: string;
  company_id: string;
  profile_id: string;
  pay_period_id: string;
  pay_rate_id?: string | null;
  regular_hours: number;
  overtime_hours: number;
  weekend_hours: number;
  holiday_hours: number;
  regular_pay: number; // In pence
  overtime_pay: number; // In pence
  weekend_pay: number; // In pence
  holiday_pay: number; // In pence
  bonus: number; // In pence
  commission: number; // In pence
  tips: number; // In pence
  other_earnings: number; // In pence
  gross_pay: number; // In pence
  tax_paye: number; // In pence
  national_insurance: number; // In pence
  pension: number; // In pence
  student_loan: number; // In pence
  other_deductions: number; // In pence
  total_deductions: number; // In pence
  net_pay: number; // In pence
  tax_code?: string | null;
  ni_category: string;
  ytd_gross: number; // In pence
  ytd_tax: number; // In pence
  ytd_ni: number; // In pence
  status: PayslipStatus;
  notes?: string | null;
  employee_notes?: string | null;
  calculated_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayslipView extends Payslip {
  period_start: string;
  period_end: string;
  pay_date: string;
  employee_name: string;
  employee_email?: string | null;
  position_title?: string | null;
  pay_type: PayType;
  base_rate: number;
  gross_pay_pounds: number;
  net_pay_pounds: number;
  tax_pounds: number;
  ni_pounds: number;
}

export type AdjustmentType = 'deduction' | 'addition';

export type AdjustmentCategory = 
  | 'pension' 
  | 'student_loan' 
  | 'attachment' 
  | 'advance' 
  | 'bonus' 
  | 'commission' 
  | 'expense' 
  | 'allowance' 
  | 'other';

export type AdjustmentRecurrence = 'every_pay' | 'monthly' | 'annual';

export interface PayrollAdjustment {
  id: string;
  company_id: string;
  profile_id: string;
  adjustment_type: AdjustmentType;
  category: AdjustmentCategory;
  name: string;
  description?: string | null;
  amount: number; // In pence
  is_percentage: boolean;
  percentage?: number | null;
  is_recurring: boolean;
  recurrence?: AdjustmentRecurrence | null;
  effective_from: string;
  effective_to?: string | null;
  pay_period_id?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface PaySummary {
  total_gross: number;
  total_tax: number;
  total_ni: number;
  total_net: number;
  payslip_count: number;
  avg_gross: number;
}

