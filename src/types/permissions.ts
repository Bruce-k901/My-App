/**
 * Roles & Permissions Types
 * Based on the Teamly Roles & Permissions implementation brief
 */

// Permission scopes
export type PermissionScope = 'self' | 'team' | 'site' | 'area' | 'region' | 'all';

// Permission areas
export type PermissionArea = 
  | 'employees' 
  | 'schedule' 
  | 'attendance' 
  | 'leave' 
  | 'payroll' 
  | 'performance' 
  | 'training' 
  | 'recruitment' 
  | 'onboarding' 
  | 'settings' 
  | 'reports';

// Permission actions
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

// Sensitivity levels
export type SensitivityLevel = 'critical' | 'high' | 'medium' | 'low';

// Role interface
export interface Role {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  hierarchy_level: number;
  is_system_role: boolean;
  is_active: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Permission interface
export interface Permission {
  id: string; // e.g., 'employees.view'
  area: PermissionArea;
  action: PermissionAction;
  name: string;
  description: string | null;
  sensitivity: SensitivityLevel;
  supports_scope: boolean;
  sort_order: number;
  created_at: string;
}

// Role permission (junction)
export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  scope: PermissionScope;
  created_at: string;
  granted_by: string | null;
  permission?: Permission; // Joined
}

// User role assignment
export interface UserRole {
  id: string;
  profile_id: string;
  role_id: string;
  site_id: string | null;
  area_id: string | null;
  region_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
  expires_at: string | null;
  role?: Role; // Joined
}

// Expanded role with permissions (for UI)
export interface RoleWithPermissions extends Role {
  permissions: (RolePermission & { permission: Permission })[];
}

// User's effective permissions (computed)
export interface EffectivePermission {
  permission_id: string;
  scope: PermissionScope;
  site_ids?: string[]; // If scope is 'site', which sites
  area_ids?: string[]; // If scope is 'area', which areas
  region_ids?: string[]; // If scope is 'region', which regions
}

// Permission check result
export interface PermissionCheck {
  allowed: boolean;
  scope: PermissionScope;
  reason?: string;
}

// Role form data (for creating/editing)
export interface RoleForm {
  name: string;
  slug: string;
  description: string;
  hierarchy_level: number;
  color: string;
  icon: string;
  is_active: boolean;
}

// Permission assignment (for role editor)
export interface PermissionAssignment {
  permission_id: string;
  scope: PermissionScope;
  enabled: boolean;
}

