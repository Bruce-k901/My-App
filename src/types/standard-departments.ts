/**
 * Standard Departments Types
 * Reference data for common department names
 */

export interface StandardDepartment {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  parent_department_id?: string | null;
  display_order: number;
  created_at: string;
  parent?: {
    id: string;
    name: string;
  } | null;
}

export const STANDARD_DEPARTMENT_CATEGORIES = [
  'Operations',
  'Management',
  'Support',
  'Sales & Marketing',
  'Hospitality',
  'Other',
] as const;

