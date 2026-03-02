// Compliance Hub type definitions
// Used by /dashboard/people/compliance and its components

export type ComplianceStatus =
  | 'compliant'
  | 'action_required'
  | 'expiring_soon'
  | 'expired'
  | 'missing'
  | 'not_applicable';

export type ComplianceCategory =
  | 'right_to_work'
  | 'dbs'
  | 'training'
  | 'documents'
  | 'probation';

export type ComplianceActionType =
  | 'update_rtw'
  | 'update_dbs'
  | 'upload_doc'
  | 'record_training'
  | 'assign_training'
  | 'update_field';

export interface ComplianceItem {
  category: ComplianceCategory;
  label: string;
  status: ComplianceStatus;
  detail?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  actionType?: ComplianceActionType;
  actionMeta?: Record<string, string>;
}

export interface EmployeeCompliance {
  profileId: string;
  fullName: string;
  employeeNumber?: string;
  department?: string;
  siteId?: string;
  siteIds: string[];        // all sites: home_site + user_site_access entries
  siteName?: string;
  avatarUrl?: string;
  startDate?: string;
  overallScore: number;
  items: ComplianceItem[];
  rtw: ComplianceStatus;
  dbs: ComplianceStatus;
  training: ComplianceStatus;
  documents: ComplianceStatus;
  probation: ComplianceStatus;
}

export interface ComplianceSummary {
  totalEmployees: number;
  fullyCompliant: number;
  actionRequired: number;
  expiringSoon: number;
  overallScore: number;
  byCategory: CategorySummary[];
}

export interface CategorySummary {
  category: ComplianceCategory;
  label: string;
  compliant: number;
  total: number;
  urgent: number;
}

export interface ComplianceActionSheetState {
  open: boolean;
  mode: ComplianceActionType | null;
  employeeId: string;
  employeeName: string;
  meta?: Record<string, string>;
}
