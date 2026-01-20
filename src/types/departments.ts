/**
 * Department Types
 * Flexible department structure with contact information and metadata
 */

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_mobile?: string | null;
  contact_details?: ContactDetails | null;
  status: 'active' | 'inactive' | 'archived';
  parent_department_id?: string | null;
  metadata?: DepartmentMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface ContactDetails {
  address?: string;
  extension?: string;
  office_location?: string;
  alternate_email?: string;
  notes?: string;
  [key: string]: any; // Allow additional flexible fields
}

export interface DepartmentMetadata {
  budget_code?: string;
  cost_center?: string;
  head_count?: number;
  location?: string;
  manager_id?: string;
  [key: string]: any; // Allow additional flexible fields
}

export interface DepartmentForm {
  name: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_mobile?: string;
  contact_details?: ContactDetails;
  status: 'active' | 'inactive' | 'archived';
  parent_department_id?: string | null;
  metadata?: DepartmentMetadata;
}

export const DEFAULT_DEPARTMENT_FORM: DepartmentForm = {
  name: '',
  description: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_mobile: '',
  contact_details: {},
  status: 'active',
  parent_department_id: null,
  metadata: {},
};

