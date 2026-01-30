// =============================================
// TEAMLY SETTINGS TYPES
// TypeScript interfaces for shift rules and notifications
// =============================================

// =============================================
// SHIFT RULES
// =============================================
export interface ShiftRules {
  id: string;
  company_id: string;
  
  // Working Time Directive
  min_rest_between_shifts: number;
  weekly_rest_type: '24_per_week' | '48_per_fortnight';
  min_weekly_rest_hours: number;
  max_weekly_hours: number;
  weekly_hours_reference_weeks: number;
  
  // Breaks
  break_threshold_minutes: number;
  break_duration_minutes: number;
  paid_breaks: boolean;
  
  // Night shifts
  night_shift_start: string; // TIME format 'HH:MM'
  night_shift_end: string; // TIME format 'HH:MM'
  max_night_shift_hours: number;
  
  // Overtime
  overtime_threshold_daily: number | null;
  overtime_threshold_weekly: number | null;
  
  // Opt-outs
  allow_wtd_opt_out: boolean;
  
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

// Default values - ALWAYS use these when creating new company
export const DEFAULT_SHIFT_RULES: Omit<ShiftRules, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> = {
  min_rest_between_shifts: 11,
  weekly_rest_type: '24_per_week',
  min_weekly_rest_hours: 24,
  max_weekly_hours: 48,
  weekly_hours_reference_weeks: 17,
  break_threshold_minutes: 360,
  break_duration_minutes: 20,
  paid_breaks: false,
  night_shift_start: '23:00',
  night_shift_end: '06:00',
  max_night_shift_hours: 8,
  overtime_threshold_daily: null,
  overtime_threshold_weekly: 40,
  allow_wtd_opt_out: true,
};

// =============================================
// NOTIFICATION TYPES
// =============================================
export type NotificationCategory = 'shifts' | 'approvals' | 'deadlines' | 'compliance';

export interface NotificationChannel {
  in_app: boolean;
  email: boolean;
  push: boolean;
  sms?: boolean; // Future expansion
}

export interface NotificationType {
  id: string;
  category: NotificationCategory;
  name: string;
  description: string | null;
  default_enabled: boolean;
  default_channels: NotificationChannel;
  default_timing: Record<string, any>;
  default_recipients: string[];
  sort_order: number;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  company_id: string;
  notification_type: string;
  enabled: boolean;
  channels: NotificationChannel;
  timing_config: Record<string, any>;
  recipient_roles: string[];
  created_at: string;
  updated_at: string;
}

// =============================================
// APPROVAL WORKFLOW TYPES
// =============================================
export type ApprovalType = 'timesheet' | 'rota' | 'leave' | 'payroll';
export type ApproverRole = 'manager' | 'area_manager' | 'regional_manager' | 'owner';

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  approval_type: ApprovalType;
  required_role: ApproverRole;
  allow_self_approval: boolean;
  require_comment_on_reject: boolean;
  auto_approve_after_days: number | null; // NULL = never auto-approve
  created_at: string;
  updated_at: string;
}

export const DEFAULT_APPROVAL_WORKFLOWS: Omit<ApprovalWorkflow, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
  { approval_type: 'timesheet', required_role: 'manager', allow_self_approval: false, require_comment_on_reject: true, auto_approve_after_days: null },
  { approval_type: 'rota', required_role: 'area_manager', allow_self_approval: false, require_comment_on_reject: false, auto_approve_after_days: null },
  { approval_type: 'leave', required_role: 'manager', allow_self_approval: false, require_comment_on_reject: true, auto_approve_after_days: null },
  { approval_type: 'payroll', required_role: 'area_manager', allow_self_approval: false, require_comment_on_reject: true, auto_approve_after_days: null },
];

// =============================================
// WTD OPT-OUTS
// =============================================
export interface WTDOptOut {
  id: string;
  company_id: string;
  profile_id: string;
  opted_out: boolean;
  opted_out_at: string | null;
  opt_out_document_url: string | null;
  withdrawal_requested_at: string | null;
  withdrawal_effective_at: string | null;
  created_at: string;
  updated_at: string;
}

