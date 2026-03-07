import type { TerminationReason } from './teamly';

// ============================================================================
// OFFBOARDING / STAFF TERMINATION TYPES
// UK Employment Law compliant
// ============================================================================

/** Sub-reasons for employer-initiated dismissal (maps to 5 fair reasons under ERA 1996 s.98) */
export type DismissalSubReason =
  | 'conduct'
  | 'capability'
  | 'gross_misconduct'
  | 'statutory_illegality'
  | 'sosr'; // Some Other Substantial Reason

/** Wizard step identifiers */
export type OffboardingStep = 'reason' | 'dates' | 'checklist' | 'final_pay' | 'confirm';

/** Main form data collected through the wizard */
export interface OffboardingFormData {
  termination_reason: TerminationReason;
  termination_sub_reason: DismissalSubReason | null;
  termination_notes: string;
  termination_date: string; // ISO date — effective date of termination
  last_working_day: string; // ISO date — may differ if PILON or garden leave
  notice_end_date: string;  // ISO date — auto-calculated, editable
  pilon_applicable: boolean;
  eligible_for_rehire: boolean | null;
  exit_interview_completed: boolean;
  schedule_exit_interview: boolean;
}

/** Result of notice period calculation */
export interface NoticePeriodCalculation {
  statutory_weeks: number;
  contractual_weeks: number;
  applicable_weeks: number; // max(statutory, contractual)
  notice_start_date: string;
  notice_end_date: string;
  last_working_day: string;
  is_pilon: boolean;
  is_summary_dismissal: boolean;
  service_years: number;
  service_months: number;
}

/** Estimated final pay breakdown (all amounts in pence) */
export interface FinalPayEstimate {
  outstanding_wages: number;
  accrued_holiday_pay: number;
  accrued_holiday_days: number;
  notice_pay: number;
  statutory_redundancy_pay: number;
  total_final_pay: number;

  // Breakdown details
  daily_rate: number;
  weekly_rate: number;
  working_days_remaining: number;
  holiday_days_entitled: number;
  holiday_days_taken: number;
  holiday_days_remaining: number;

  // Redundancy details (populated when applicable)
  redundancy_qualifying_years: number;
  redundancy_weekly_pay_used: number; // capped weekly pay
  age_at_termination: number;
}

/** Key dates timeline for the offboarding process */
export interface OffboardingTimeline {
  termination_initiated: string;
  notice_start: string;
  last_working_day: string;
  notice_end: string;
  final_pay_date: string;
  p45_due_by: string;
  tribunal_window_end: string;   // 3 months less 1 day (ERA 2025 extends to 6 months from Oct 2026)
  document_retention_until: string; // 6 years from termination
}

/** Offboarding checklist item (DB row) */
export interface OffboardingChecklistItem {
  id: string;
  company_id: string;
  profile_id: string;
  category: ChecklistCategory;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  due_date: string | null;
  sort_order: number;
  is_required: boolean;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

/** Checklist item categories */
export type ChecklistCategory =
  | 'it_access'
  | 'equipment'
  | 'payroll'
  | 'admin'
  | 'knowledge_transfer'
  | 'compliance';

/** ACAS guidance object — displayed per termination reason */
export interface ACASGuidance {
  title: string;
  required_steps: string[];
  warnings: string[];
  documents_needed: string[];
  legal_references: string[];
}

/** Labels for termination reasons */
export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  resigned: 'Resignation',
  dismissed: 'Dismissal',
  redundancy: 'Redundancy',
  end_of_contract: 'End of Fixed-Term Contract',
  retired: 'Retirement',
  mutual_agreement: 'Mutual Agreement / Settlement',
  other: 'Other',
};

/** Labels for dismissal sub-reasons */
export const DISMISSAL_SUB_REASON_LABELS: Record<DismissalSubReason, string> = {
  conduct: 'Conduct',
  capability: 'Capability / Performance',
  gross_misconduct: 'Gross Misconduct (Summary Dismissal)',
  statutory_illegality: 'Statutory Illegality',
  sosr: 'Some Other Substantial Reason (SOSR)',
};

/** Labels for checklist categories */
export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  it_access: 'IT & Access',
  equipment: 'Equipment & Property',
  payroll: 'Payroll & Finance',
  admin: 'Administration',
  knowledge_transfer: 'Knowledge Transfer',
  compliance: 'Compliance',
};
