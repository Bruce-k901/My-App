import type { ModuleImportConfig, BulkImportField } from './types';
import { toE164 } from '@/lib/whatsapp/phone';

const ROLE_MAP: Record<string, string> = {
  employee: 'Staff',
  staff: 'Staff',
  'team member': 'Staff',
  supervisor: 'Manager',
  'location manager': 'Manager',
  manager: 'Manager',
  admin: 'Admin',
  administrator: 'Admin',
  'system administrator': 'Admin',
  owner: 'Owner',
  'general manager': 'General Manager',
  gm: 'General Manager',
};

const VALID_ROLES = ['Staff', 'Manager', 'Admin', 'Owner', 'General Manager'];

const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: 'permanent',
  'full time': 'permanent',
  'full-time': 'permanent',
  fulltime: 'permanent',
  permanent: 'permanent',
  part_time: 'permanent',
  'part time': 'permanent',
  'part-time': 'permanent',
  parttime: 'permanent',
  fixed_term: 'fixed_term',
  'fixed term': 'fixed_term',
  'fixed-term': 'fixed_term',
  zero_hours: 'zero_hours',
  'zero hours': 'zero_hours',
  'zero-hours': 'zero_hours',
  casual: 'casual',
  agency: 'agency',
  temp: 'casual',
  temporary: 'casual',
  contractor: 'contractor',
  freelance: 'contractor',
  'self-employed': 'contractor',
  'self employed': 'contractor',
  apprentice: 'apprentice',
};

function normalisePhone(v: string): string | null {
  if (!v || !v.trim()) return null;
  return toE164(v.trim(), 'GB') || v.trim();
}

function parseDate(v: string): string | null {
  if (!v || !v.trim()) return null;
  const trimmed = v.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try DD/MM/YYYY or DD-MM-YYYY (UK format)
  const ukMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try MM/DD/YYYY (US format) — only if day > 12
  const usMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    if (Number(month) <= 12) {
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  // Try natural language date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

export const TEAMLY_IMPORT_FIELDS: BulkImportField[] = [
  {
    key: 'full_name',
    label: 'Full Name',
    required: true,
    aliases: ['name', 'employee name', 'staff name', 'display name', 'full_name', 'employee', 'team member', 'full name'],
    type: 'text',
    validate: (v) => (!v || !v.trim()) ? 'Full name is required' : null,
  },
  {
    key: 'email',
    label: 'Email',
    required: true,
    aliases: ['email address', 'work email', 'e-mail', 'email_address'],
    type: 'email',
    transform: (v) => v?.toLowerCase().trim() || '',
    validate: (v) => {
      if (!v || !v.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email format';
      return null;
    },
  },
  {
    key: 'phone_number',
    label: 'Phone',
    required: false,
    aliases: ['phone', 'mobile', 'telephone', 'contact number', 'phone_number', 'mobile number', 'cell'],
    type: 'phone',
    transform: (v) => normalisePhone(v),
  },
  {
    key: 'app_role',
    label: 'Role',
    required: false,
    aliases: ['role', 'user role', 'access level', 'permission', 'app_role', 'system role'],
    type: 'select',
    selectOptions: VALID_ROLES,
    transform: (v) => {
      if (!v || !v.trim()) return 'Staff';
      const lower = v.trim().toLowerCase();
      return ROLE_MAP[lower] || (VALID_ROLES.includes(v.trim()) ? v.trim() : 'Staff');
    },
  },
  {
    key: 'position_title',
    label: 'Job Title',
    required: false,
    aliases: ['job title', 'title', 'position', 'designation', 'job role', 'position_title'],
    type: 'text',
  },
  {
    key: 'site_name',
    label: 'Site / Location',
    required: false,
    aliases: ['site', 'location', 'branch', 'store', 'venue', 'workplace', 'home site', 'primary location'],
    type: 'text',
  },
  {
    key: 'boh_foh',
    label: 'Section (BOH/FOH)',
    required: false,
    aliases: ['section', 'department area', 'boh/foh', 'boh_foh', 'front or back'],
    type: 'select',
    selectOptions: ['BOH', 'FOH'],
    transform: (v) => {
      if (!v) return null;
      const upper = v.trim().toUpperCase();
      if (upper === 'BOH' || upper === 'BACK OF HOUSE' || upper === 'BACK') return 'BOH';
      if (upper === 'FOH' || upper === 'FRONT OF HOUSE' || upper === 'FRONT') return 'FOH';
      return null;
    },
  },
  {
    key: 'preferred_name',
    label: 'Preferred Name',
    required: false,
    aliases: ['nickname', 'known as', 'preferred_name', 'goes by'],
    type: 'text',
  },
  {
    key: 'date_of_birth',
    label: 'Date of Birth',
    required: false,
    aliases: ['dob', 'birthday', 'birth date', 'date_of_birth'],
    type: 'date',
    transform: (v) => parseDate(v),
    validate: (v) => {
      if (!v) return null;
      const d = new Date(v);
      if (isNaN(d.getTime())) return 'Invalid date format';
      if (d > new Date()) return 'Date of birth cannot be in the future';
      return null;
    },
  },
  {
    key: 'hire_date',
    label: 'Start Date',
    required: false,
    aliases: ['start date', 'hire date', 'hired', 'joined', 'date joined', 'employment start', 'hire_date', 'join date'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'employment_type',
    label: 'Contract Type',
    required: false,
    aliases: ['contract type', 'employment type', 'contract', 'employment_type', 'primary employment type'],
    type: 'select',
    selectOptions: ['permanent', 'fixed_term', 'zero_hours', 'casual', 'agency', 'contractor', 'apprentice'],
    transform: (v) => {
      if (!v || !v.trim()) return null;
      const lower = v.trim().toLowerCase();
      return EMPLOYMENT_TYPES[lower] || v.trim();
    },
  },
  {
    key: 'external_employee_id',
    label: 'Employee ID',
    required: false,
    aliases: ['employee id', 'staff id', 'emp id', 'payroll number', 'employee number', 'external_employee_id', 'ref'],
    type: 'text',
  },
  {
    key: 'emergency_contact_name',
    label: 'Emergency Contact Name',
    required: false,
    aliases: ['emergency contact', 'next of kin', 'emergency name', 'ice name', 'emergency_contact_name', 'emergency contact name'],
    type: 'text',
  },
  {
    key: 'emergency_contact_phone',
    label: 'Emergency Contact Phone',
    required: false,
    aliases: ['emergency phone', 'next of kin phone', 'ice phone', 'emergency number', 'emergency_contact_phone', 'emergency contact phone'],
    type: 'phone',
    transform: (v) => normalisePhone(v),
  },
  {
    key: 'address',
    label: 'Address',
    required: false,
    aliases: ['home address', 'residential address', 'full address'],
    type: 'text',
  },
  {
    key: 'regular_hours_per_week',
    label: 'Weekly Hours',
    required: false,
    aliases: ['contracted hours', 'weekly hours', 'hours per week', 'regular hours', 'regular_hours_per_week'],
    type: 'number',
    transform: (v) => {
      if (!v || !v.trim()) return null;
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    },
    validate: (v) => {
      if (v !== null && v !== undefined) {
        if (typeof v === 'number' && (v < 0 || v > 168)) return 'Weekly hours must be between 0 and 168';
      }
      return null;
    },
  },
  {
    key: 'gender',
    label: 'Gender',
    required: false,
    aliases: ['sex', 'gender identity'],
    type: 'text',
  },
  {
    key: 'pronouns',
    label: 'Pronouns',
    required: false,
    aliases: ['preferred pronouns'],
    type: 'text',
  },
];

export const TEAMLY_IMPORT_CONFIG: ModuleImportConfig = {
  moduleId: 'teamly',
  moduleName: 'Team Members',
  targetTable: 'profiles',
  fields: TEAMLY_IMPORT_FIELDS,
  maxRows: 500,
  batchSize: 50,
  duplicateCheckField: 'email',
  duplicateCheckScope: 'company_id',
};
