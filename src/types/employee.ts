import type { EmergencyContact } from '@/types/teamly';

export type { EmergencyContact };

/**
 * Comprehensive employee profile type used by the shared EditEmployeeModal
 * and InfoRow components. Covers ALL profile columns from the database.
 */
export interface EmployeeProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  phone?: string | null; // legacy alias from list RPC
  avatar_url: string | null;
  position_title: string | null;
  department: string | null;
  app_role: string;
  status: string;
  boh_foh: string | null;

  // Personal
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  emergency_contacts: EmergencyContact[] | any[] | null;

  // Employment
  employee_number: string | null;
  home_site: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  contract_type: string | null;
  employment_type?: string;
  contracted_hours?: number | null;
  contracted_hours_per_week?: number | null;
  hourly_rate: number | null;
  salary: number | null;
  pay_frequency: string | null;
  notice_period_weeks: number | null;
  reports_to: string | null;

  // Compliance
  national_insurance_number: string | null;
  right_to_work_status: string | null;
  right_to_work_expiry: string | null;
  right_to_work_document_type?: string | null;
  right_to_work_document_number?: string | null;
  dbs_status: string | null;
  dbs_certificate_number: string | null;
  dbs_check_date: string | null;

  // Banking
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;

  // Leave
  annual_leave_allowance: number | null;

  // Pay & Tax
  tax_code: string | null;
  student_loan: boolean | null;
  student_loan_plan: string | null;
  pension_enrolled: boolean | null;
  pension_contribution_percent: number | null;
  p45_received: boolean | null;
  p45_date?: string | null;
  p45_reference?: string | null;

  // Training
  food_safety_level: number | null;
  food_safety_expiry_date: string | null;
  h_and_s_level: number | null;
  h_and_s_expiry_date: string | null;
  fire_marshal_trained: boolean | null;
  fire_marshal_expiry_date: string | null;
  first_aid_trained: boolean | null;
  first_aid_expiry_date: string | null;
  cossh_trained: boolean | null;
  cossh_expiry_date: string | null;

  // Joined relations (optional)
  sites?: { name: string } | null;
  manager?: { full_name: string } | null;
  site_name?: string;
  reports_to_name?: string;
}

/** Minimal subset returned by the list-page RPC */
export type EmployeeListItem = Pick<EmployeeProfile,
  | 'id' | 'full_name' | 'email' | 'phone' | 'phone_number'
  | 'avatar_url' | 'position_title' | 'department' | 'home_site'
  | 'site_name' | 'status' | 'employment_type' | 'start_date'
  | 'app_role' | 'reports_to_name' | 'employee_number'
  | 'contracted_hours' | 'contracted_hours_per_week'
  | 'probation_end_date' | 'hourly_rate'
>;

export interface SiteOption {
  id: string;
  name: string;
}

export interface ManagerOption {
  id: string;
  full_name: string;
}
