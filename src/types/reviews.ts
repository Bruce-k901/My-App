// ============================================================================
// TEAMLY REVIEWS - TYPESCRIPT TYPES
// Generated from database schema
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type ReviewTemplateType =
  | 'onboarding_check_in'
  | 'probation_review'
  | 'one_to_one'
  | 'monthly_review'
  | 'quarterly_review'
  | 'annual_appraisal'
  | 'values_review'
  | 'mid_year_review'
  | 'performance_improvement'
  | 'promotion_review'
  | 'exit_interview'
  | 'return_to_work'
  // Disciplinary & Grievance
  | 'informal_discussion'
  | 'investigation_meeting'
  | 'disciplinary_hearing'
  | 'disciplinary_outcome'
  | 'appeal_hearing'
  | 'grievance_meeting'
  | 'custom';

export type ReviewQuestionType =
  | 'text_short'
  | 'text_long'
  | 'rating_scale'
  | 'rating_numeric'
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'date'
  | 'goal_tracker'
  | 'value_behavior'
  | 'file_upload'
  | 'signature';

export type ReviewScheduleStatus =
  | 'scheduled'
  | 'invitation_sent'
  | 'in_progress'
  | 'pending_manager'
  | 'pending_employee'
  | 'pending_meeting'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type ReviewStatus =
  | 'draft'
  | 'employee_in_progress'
  | 'employee_complete'
  | 'manager_in_progress'
  | 'manager_complete'
  | 'in_meeting'
  | 'pending_sign_off'
  | 'completed'
  | 'cancelled';

export type RecurrencePattern =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'annually';

export type RespondentType = 'employee' | 'manager' | 'peer' | 'hr';

export type SectionCompletedBy = 'employee' | 'manager' | 'both' | 'hr';

export type FollowUpType =
  | 'training'
  | 'goal'
  | 'meeting'
  | 'document'
  | 'action'
  | 'other';

export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';

export type FollowUpStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'overdue';

export type NoteType =
  | 'general'
  | 'private'
  | 'hr_only'
  | 'follow_up'
  | 'meeting_notes';

export type ScoreTrend = 'improving' | 'stable' | 'declining';

export type InvitationStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'started'
  | 'completed'
  | 'declined'
  | 'expired';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

// ============================================================================
// COMPANY CONFIGURATION
// ============================================================================

export interface CompanyValue {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CompanyValueCategory {
  id: string;
  value_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  value?: CompanyValue;
  behaviors?: CompanyValueBehavior[];
}

export interface CompanyValueBehavior {
  id: string;
  category_id: string;
  behavior_number: number;
  tier_1_label: string;
  tier_1_description: string;
  tier_1_score: number;
  tier_2_label: string;
  tier_2_description: string;
  tier_2_score: number;
  tier_3_label: string;
  tier_3_description: string;
  tier_3_score: number;
  tier_4_label: string | null;
  tier_4_description: string | null;
  tier_4_score: number | null;
  tier_5_label: string | null;
  tier_5_description: string | null;
  tier_5_score: number | null;
  max_tiers: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScoringScale {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  scale_type: 'numeric' | 'tier';
  min_value: number;
  max_value: number;
  show_labels: boolean;
  show_numbers: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  options?: ScoringScaleOption[];
}

export interface ScoringScaleOption {
  id: string;
  scale_id: string;
  label: string;
  value: number;
  description: string | null;
  color: string | null;
  display_order: number;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export interface ReviewTemplate {
  id: string;
  company_id: string | null;
  name: string;
  template_type: ReviewTemplateType;
  description: string | null;
  instructions: string | null;
  rationale: string | null;
  expected_outcomes: string | null;
  recommended_duration_minutes: number;
  recommended_frequency_days: number | null;
  requires_self_assessment: boolean;
  requires_manager_assessment: boolean;
  requires_peer_feedback: boolean;
  peer_feedback_count: number;
  allow_employee_to_view_manager_responses: boolean;
  scoring_scale_id: string | null;
  calculate_overall_score: boolean;
  is_system_template: boolean;
  is_active: boolean;
  version: number;
  cloned_from_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  sections?: ReviewTemplateSection[];
  scoring_scale?: ScoringScale;
}

export interface ReviewTemplateSection {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  completed_by: SectionCompletedBy;
  linked_value_id: string | null;
  display_order: number;
  is_required: boolean;
  is_collapsible: boolean;
  starts_collapsed: boolean;
  created_at: string;
  updated_at: string;
  questions?: ReviewTemplateQuestion[];
  linked_value?: CompanyValue;
}

export interface ReviewTemplateQuestion {
  id: string;
  section_id: string;
  question_text: string;
  question_type: ReviewQuestionType;
  helper_text: string | null;
  placeholder_text: string | null;
  scoring_scale_id: string | null;
  min_value: number | null;
  max_value: number | null;
  min_label: string | null;
  max_label: string | null;
  step: number;
  options: string[] | { value: string; label: string }[] | null;
  allow_other: boolean;
  linked_behavior_id: string | null;
  is_required: boolean;
  min_length: number | null;
  max_length: number | null;
  min_selections: number | null;
  max_selections: number | null;
  weight: number;
  include_in_score: boolean;
  conditional_on_question_id: string | null;
  conditional_operator: string | null;
  conditional_value: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  scoring_scale?: ScoringScale;
  linked_behavior?: CompanyValueBehavior;
}

// ============================================================================
// SCHEDULING
// ============================================================================

export interface EmployeeReviewSchedule {
  id: string;
  company_id: string;
  employee_id: string;
  template_id: string;
  title: string | null;
  scheduled_date: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_day_of_week: number | null;
  recurrence_day_of_month: number | null;
  recurrence_end_date: string | null;
  next_occurrence_date: string | null;
  manager_id: string | null;
  additional_reviewers: string[] | null;
  status: ReviewScheduleStatus;
  employee_notified_at: string | null;
  manager_notified_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  review_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  employee?: Profile;
  manager?: Profile;
  template?: ReviewTemplate;
  review?: Review;
}

export interface ReviewSchedulingRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  template_id: string;
  days_after_trigger: number;
  make_recurring: boolean;
  recurrence: RecurrencePattern | null;
  assign_to_manager: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  template?: ReviewTemplate;
}

// ============================================================================
// REVIEWS
// ============================================================================

export interface Review {
  id: string;
  company_id: string;
  schedule_id: string | null;
  template_id: string;
  employee_id: string;
  title: string | null;
  review_period_start: string | null;
  review_period_end: string | null;
  manager_id: string | null;
  conducted_by: string | null;
  status: ReviewStatus;
  employee_started_at: string | null;
  employee_completed_at: string | null;
  manager_started_at: string | null;
  manager_completed_at: string | null;
  meeting_date: string | null;
  meeting_duration_minutes: number | null;
  completed_at: string | null;
  employee_self_score: number | null;
  manager_score: number | null;
  overall_score: number | null;
  values_score: number | null;
  max_possible_score: number | null;
  employee_signed_off: boolean;
  employee_signed_at: string | null;
  employee_signature_text: string | null;
  manager_signed_off: boolean;
  manager_signed_at: string | null;
  manager_signature_text: string | null;
  template_version: number | null;
  template_snapshot: object | null;
  created_at: string;
  updated_at: string;
  employee?: Profile;
  manager?: Profile;
  template?: ReviewTemplate;
  responses?: ReviewResponse[];
  notes?: ReviewNote[];
  follow_ups?: ReviewFollowUp[];
  appointment?: ReviewAppointment;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  question_id: string;
  section_id: string | null;
  respondent_type: RespondentType; // Database column name
  respondent_id: string | null;
  response_text: string | null;
  response_number: number | null;
  response_boolean: boolean | null;
  response_date: string | null;
  response_json: object | null;
  behavior_tier_selected: number | null;
  behavior_example: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  score: number | null;
  max_score: number | null;
  answered_at: string;
  updated_at: string;
  question?: ReviewTemplateQuestion;
}

// ============================================================================
// SUPPORTING FEATURES
// ============================================================================

export interface ReviewInvitation {
  id: string;
  review_id: string;
  recipient_id: string;
  recipient_type: RespondentType;
  subject: string | null;
  message: string | null;
  sent_at: string | null;
  sent_via: string;
  status: InvitationStatus;
  opened_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
  access_token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
  recipient?: Profile;
  review?: Review;
}

export interface ReviewAppointment {
  id: string;
  review_id: string;
  company_id: string;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  location: string | null;
  location_type: string;
  video_link: string | null;
  organizer_id: string | null;
  attendee_ids: string[];
  external_calendar_id: string | null;
  external_calendar_type: string | null;
  external_calendar_link: string | null;
  last_synced_at: string | null;
  status: AppointmentStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  actual_start: string | null;
  actual_end: string | null;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  organizer?: Profile;
  review?: Review;
}

export interface ReviewNote {
  id: string;
  review_id: string;
  author_id: string;
  note_type: NoteType;
  title: string | null;
  content: string;
  note_text?: string; // Alias for content for compatibility
  phase?: 'before' | 'during' | 'after'; // Extracted from metadata
  visible_to_employee: boolean;
  visible_to_manager: boolean;
  visible_to_hr: boolean;
  is_meeting_note?: boolean;
  is_pinned?: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface ReviewFollowUp {
  id: string;
  review_id: string;
  company_id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string | null;
  due_date: string | null;
  reminder_date: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  completed_by: string | null;
  follow_up_type: FollowUpType;
  priority: FollowUpPriority;
  linked_goal_id: string | null;
  linked_training_id: string | null;
  progress_notes: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  assigner?: Profile;
  review?: Review;
}

export interface EmployeeReviewSummary {
  id: string;
  employee_id: string;
  company_id: string;
  total_reviews_completed: number;
  total_one_to_ones: number;
  total_appraisals: number;
  total_values_reviews: number;
  latest_overall_score: number | null;
  latest_self_score: number | null;
  latest_manager_score: number | null;
  latest_values_score: number | null;
  score_trend: ScoreTrend | null;
  average_score_6_months: number | null;
  average_score_12_months: number | null;
  first_review_date: string | null;
  last_review_date: string | null;
  next_scheduled_review: string | null;
  last_one_to_one_date: string | null;
  last_appraisal_date: string | null;
  last_values_review_date: string | null;
  has_overdue_reviews: boolean;
  overdue_review_count: number;
  has_pending_follow_ups: boolean;
  pending_follow_up_count: number;
  updated_at: string;
  employee?: Profile;
}

// ============================================================================
// PROFILE (simplified - adjust to match your actual Profile type)
// ============================================================================

export interface Profile {
  id: string;
  auth_user_id: string;
  company_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  app_role: string;
  position_title: string | null;
  department: string | null;
  reports_to: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  status: string;
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

export interface CreateCompanyValueInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order?: number;
}

export interface CreateScoringScaleInput {
  name: string;
  description?: string;
  scale_type: 'numeric' | 'tier';
  min_value?: number;
  max_value?: number;
  is_default?: boolean;
  options?: Omit<ScoringScaleOption, 'id' | 'scale_id'>[];
}

export interface CreateReviewTemplateInput {
  name: string;
  template_type: ReviewTemplateType;
  description?: string;
  instructions?: string;
  rationale?: string;
  expected_outcomes?: string;
  recommended_duration_minutes?: number;
  recommended_frequency_days?: number;
  requires_self_assessment?: boolean;
  requires_manager_assessment?: boolean;
  scoring_scale_id?: string;
  calculate_overall_score?: boolean;
}

export interface CreateReviewScheduleInput {
  employee_id: string;
  template_id: string;
  title?: string;
  scheduled_date: string;
  due_date?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  manager_id?: string;
}

export interface CreateReviewInput {
  employee_id: string;
  template_id: string;
  title?: string;
  review_period_start?: string;
  review_period_end?: string;
  manager_id?: string;
}

export interface SaveResponseInput {
  review_id: string;
  question_id: string;
  respondent: RespondentType;
  response_text?: string;
  response_number?: number;
  response_boolean?: boolean;
  response_date?: string;
  response_json?: object;
  behavior_tier_selected?: number;
  behavior_example?: string;
}

export interface CreateFollowUpInput {
  review_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  due_date?: string;
  follow_up_type?: FollowUpType;
  priority?: FollowUpPriority;
}

export interface CreateNoteInput {
  review_id: string;
  title?: string;
  content: string;
  note_type?: NoteType;
  visible_to_employee?: boolean;
  visible_to_manager?: boolean;
  visible_to_hr?: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReviewWithDetails extends Review {
  employee: Profile;
  manager: Profile | null;
  template: ReviewTemplate & {
    sections: (ReviewTemplateSection & {
      questions: ReviewTemplateQuestion[];
    })[];
  };
  responses: ReviewResponse[];
}

export interface EmployeeSicknessRecord {
  id: string;
  illness_onset_date: string;
  symptoms: string;
  exclusion_period_start: string;
  exclusion_period_end?: string | null;
  return_to_work_date?: string | null;
  status: 'active' | 'cleared' | 'closed';
  medical_clearance_required: boolean;
  medical_clearance_received: boolean;
  rtw_conducted_date?: string | null;
  rtw_fit_for_full_duties?: boolean | null;
  rtw_adjustments_needed?: boolean | null;
  rtw_adjustments_details?: string | null;
}

export interface EmployeeFileData {
  employee: Profile;
  summary: EmployeeReviewSummary | null;
  reviews: Review[];
  upcoming_schedules: EmployeeReviewSchedule[];
  pending_follow_ups: ReviewFollowUp[];
  timeline: TimelineEvent[];
  sickness_records?: EmployeeSicknessRecord[];
}

export interface TimelineEvent {
  id: string;
  type: 'review_completed' | 'review_scheduled' | 'follow_up_created' | 'follow_up_completed' | 'note_added';
  title: string;
  description: string | null;
  date: string;
  metadata: object;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface ReviewsDashboardStats {
  total_reviews_this_month: number;
  completed_reviews_this_month: number;
  overdue_reviews: number;
  upcoming_reviews_7_days: number;
  pending_follow_ups: number;
  average_score_this_month: number | null;
}

export interface OverdueReview {
  id: string;
  employee_name: string;
  employee_id: string;
  manager_name: string | null;
  template_name: string;
  template_type: ReviewTemplateType;
  scheduled_date: string;
  due_date: string;
  days_overdue: number;
}

export interface UpcomingReview {
  id: string;
  employee_name: string;
  employee_id: string;
  manager_name: string | null;
  template_name: string;
  template_type: ReviewTemplateType;
  scheduled_date: string;
  due_date: string | null;
  days_until: number;
  status: ReviewScheduleStatus;
}

