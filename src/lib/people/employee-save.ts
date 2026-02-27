import type { EmergencyContact } from '@/types/teamly';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Convert empty strings / undefined to null */
const toNullIfEmpty = (value: any) => {
  if (value === '' || value === undefined) return null;
  return value;
};

/**
 * Converts form data + emergency contacts into a DB-ready update payload.
 * Used by both employees/page.tsx and [id]/page.tsx when saving the edit modal.
 */
export function buildProfileUpdateData(
  formData: Record<string, any>,
  emergencyContacts: EmergencyContact[],
  employeeNumber?: string | null,
) {
  // Keep any emergency contact row that has at least one meaningful value.
  const validEmergencyContacts = emergencyContacts
    .map((c) => ({
      name: (c.name || '').trim(),
      relationship: (c.relationship || '').trim(),
      phone: (c.phone || '').trim(),
      email: (c.email || '').trim(),
    }))
    .filter((c) => !!(c.name || c.relationship || c.phone || c.email));

  const empNum = employeeNumber ?? formData.employee_number;

  return {
    full_name: formData.full_name,
    email: formData.email,
    phone_number: toNullIfEmpty(formData.phone_number),
    date_of_birth: toNullIfEmpty(formData.date_of_birth),
    gender: toNullIfEmpty(formData.gender),
    nationality: toNullIfEmpty(formData.nationality),
    address_line_1: toNullIfEmpty(formData.address_line_1),
    address_line_2: toNullIfEmpty(formData.address_line_2),
    city: toNullIfEmpty(formData.city),
    county: toNullIfEmpty(formData.county),
    postcode: toNullIfEmpty(formData.postcode),
    country: formData.country || 'United Kingdom',
    emergency_contacts: validEmergencyContacts.length > 0 ? validEmergencyContacts : null,

    employee_number: toNullIfEmpty(empNum),
    position_title: toNullIfEmpty(formData.position_title),
    department: toNullIfEmpty(formData.department),
    app_role: formData.app_role || 'Staff',
    home_site: toNullIfEmpty(formData.home_site),
    reports_to: toNullIfEmpty(formData.reports_to),
    start_date: toNullIfEmpty(formData.start_date),
    probation_end_date: toNullIfEmpty(formData.probation_end_date),
    contract_type: formData.contract_type || 'permanent',
    contracted_hours_per_week:
      formData.contracted_hours && formData.contracted_hours !== ''
        ? parseFloat(formData.contracted_hours)
        : formData.contracted_hours_per_week && formData.contracted_hours_per_week !== ''
          ? parseFloat(formData.contracted_hours_per_week.toString())
          : null,
    hourly_rate:
      formData.hourly_rate && formData.hourly_rate !== ''
        ? Math.round(parseFloat(formData.hourly_rate) * 100) // Convert to pence
        : null,
    salary:
      formData.salary && formData.salary !== '' ? parseFloat(formData.salary) : null,
    pay_frequency: formData.pay_frequency || 'monthly',
    notice_period_weeks:
      formData.notice_period_weeks && formData.notice_period_weeks !== ''
        ? parseInt(formData.notice_period_weeks.toString())
        : 1,
    boh_foh: formData.boh_foh || 'FOH',

    // Compliance
    national_insurance_number: toNullIfEmpty(formData.national_insurance_number),
    right_to_work_status: formData.right_to_work_status || 'pending',
    right_to_work_expiry: toNullIfEmpty(formData.right_to_work_expiry),
    right_to_work_document_type: toNullIfEmpty(formData.right_to_work_document_type),
    right_to_work_document_number: toNullIfEmpty(formData.right_to_work_document_number),
    dbs_status: formData.dbs_status || 'not_required',
    dbs_certificate_number: toNullIfEmpty(formData.dbs_certificate_number),
    dbs_check_date: toNullIfEmpty(formData.dbs_check_date),

    // Banking
    bank_name: toNullIfEmpty(formData.bank_name),
    bank_account_name: toNullIfEmpty(formData.bank_account_name),
    bank_account_number: toNullIfEmpty(formData.bank_account_number),
    bank_sort_code: toNullIfEmpty(formData.bank_sort_code),

    annual_leave_allowance:
      formData.annual_leave_allowance && formData.annual_leave_allowance !== ''
        ? parseFloat(formData.annual_leave_allowance.toString())
        : 28,

    // Pay & Tax
    tax_code: toNullIfEmpty(formData.tax_code),
    student_loan: formData.student_loan || false,
    student_loan_plan: toNullIfEmpty(formData.student_loan_plan),
    pension_enrolled: formData.pension_enrolled || false,
    pension_contribution_percent:
      formData.pension_contribution_percent && formData.pension_contribution_percent !== ''
        ? parseFloat(formData.pension_contribution_percent.toString())
        : null,
    p45_received: formData.p45_received || false,
    p45_date: toNullIfEmpty(formData.p45_date),
    p45_reference: toNullIfEmpty(formData.p45_reference),

    // Training
    food_safety_level:
      formData.food_safety_level && formData.food_safety_level !== ''
        ? parseInt(formData.food_safety_level.toString())
        : null,
    food_safety_expiry_date: toNullIfEmpty(formData.food_safety_expiry_date),
    h_and_s_level:
      formData.h_and_s_level && formData.h_and_s_level !== ''
        ? parseInt(formData.h_and_s_level.toString())
        : null,
    h_and_s_expiry_date: toNullIfEmpty(formData.h_and_s_expiry_date),
    fire_marshal_trained: formData.fire_marshal_trained || false,
    fire_marshal_expiry_date: toNullIfEmpty(formData.fire_marshal_expiry_date),
    first_aid_trained: formData.first_aid_trained || false,
    first_aid_expiry_date: toNullIfEmpty(formData.first_aid_expiry_date),
    cossh_trained: formData.cossh_trained || false,
    cossh_expiry_date: toNullIfEmpty(formData.cossh_expiry_date),

    status: formData.status || 'active',
  };
}

/**
 * Converts a raw DB profile row into form-friendly string values.
 * Used when opening the edit modal from both pages.
 */
export function mapProfileToFormData(profileData: Record<string, any>): Record<string, any> {
  return {
    ...profileData,
    phone_number: profileData.phone_number || profileData.phone || '',
    contracted_hours: profileData.contracted_hours_per_week?.toString() || '',
    hourly_rate: profileData.hourly_rate ? (profileData.hourly_rate / 100).toString() : '', // Convert from pence
    salary: profileData.salary?.toString() || '',
    notice_period_weeks: profileData.notice_period_weeks?.toString() || '1',
    annual_leave_allowance: profileData.annual_leave_allowance?.toString() || '28',
    employee_number: profileData.employee_number || '',
    probation_end_date: profileData.probation_end_date || '',
    national_insurance_number: profileData.national_insurance_number || '',
    right_to_work_status: profileData.right_to_work_status || 'pending',
    right_to_work_expiry: profileData.right_to_work_expiry || '',
    right_to_work_document_type: profileData.right_to_work_document_type || '',
    right_to_work_document_number: profileData.right_to_work_document_number || '',
    dbs_status: profileData.dbs_status || 'not_required',
    dbs_certificate_number: profileData.dbs_certificate_number || '',
    dbs_check_date: profileData.dbs_check_date || '',
    bank_name: profileData.bank_name || '',
    bank_account_name: profileData.bank_account_name || '',
    bank_account_number: profileData.bank_account_number || '',
    bank_sort_code: profileData.bank_sort_code || '',
    tax_code: profileData.tax_code || '',
    student_loan: profileData.student_loan || false,
    student_loan_plan: profileData.student_loan_plan || '',
    pension_enrolled: profileData.pension_enrolled || false,
    pension_contribution_percent: profileData.pension_contribution_percent?.toString() || '',
    p45_received: profileData.p45_received || false,
    p45_date: profileData.p45_date || '',
    p45_reference: profileData.p45_reference || '',
    food_safety_level: profileData.food_safety_level?.toString() || '',
    food_safety_expiry_date: profileData.food_safety_expiry_date || '',
    h_and_s_level: profileData.h_and_s_level?.toString() || '',
    h_and_s_expiry_date: profileData.h_and_s_expiry_date || '',
    fire_marshal_trained: profileData.fire_marshal_trained || false,
    fire_marshal_expiry_date: profileData.fire_marshal_expiry_date || '',
    first_aid_trained: profileData.first_aid_trained || false,
    first_aid_expiry_date: profileData.first_aid_expiry_date || '',
    cossh_trained: profileData.cossh_trained || false,
    cossh_expiry_date: profileData.cossh_expiry_date || '',
  };
}

/**
 * Auto-generates the next employee number e.g. "OKAEMP001".
 * Uses first 3 chars of company name as prefix.
 */
export async function generateNextEmployeeNumber(
  supabaseClient: SupabaseClient,
  companyId: string,
  companyName: string,
): Promise<string | null> {
  try {
    const companyPrefix = companyName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();

    if (!companyPrefix || companyPrefix.length < 3) {
      console.warn('Company name too short for prefix');
      return null;
    }

    const prefix = `${companyPrefix}EMP`;

    const { data: existingEmployees, error } = await supabaseClient
      .from('profiles')
      .select('employee_number')
      .eq('company_id', companyId)
      .not('employee_number', 'is', null)
      .like('employee_number', `${prefix}%`);

    if (error) {
      console.error('Error fetching existing employee numbers:', error);
      return null;
    }

    let maxNumber = 0;
    if (existingEmployees && existingEmployees.length > 0) {
      existingEmployees.forEach((emp: any) => {
        const match = emp.employee_number?.match(/\d+$/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating employee number:', err);
    return null;
  }
}
