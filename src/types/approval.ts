export interface Region {
  id: string;
  name: string;
  manager_id?: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Area {
  id: string;
  name: string;
  region_id: string;
  manager_id?: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export type WorkflowType = 'rota' | 'payroll' | 'leave' | 'expenses' | 'time_off' | 'other';

export interface ApprovalWorkflow {
  id: string;
  name: string;
  type: WorkflowType;
  description?: string;
  is_active: boolean;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export type ApprovalRole = 
  | 'Manager'
  | 'Area Manager'
  | 'Regional Manager'
  | 'Operations Manager'
  | 'Finance Manager'
  | 'HR Manager'
  | 'Owner'
  | 'Admin'
  | 'Super Admin';

export interface ApprovalStep {
  id: string;
  workflow_id: string;
  step_number: number;
  approver_role: ApprovalRole;
  can_reject: boolean;
  required: boolean;
  created_at?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  requested_by: string;
  current_step: number;
  status: ApprovalStatus;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type ApprovalActionType = 'approved' | 'rejected' | 'commented';

export interface ApprovalAction {
  id: string;
  request_id: string;
  step_number: number;
  action_by: string;
  action: ApprovalActionType;
  comments?: string;
  created_at?: string;
}

