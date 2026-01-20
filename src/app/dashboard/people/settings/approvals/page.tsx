'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui';
import Select from '@/components/ui/Select';
import { GitBranch, Plus, Edit2, Trash2, X, MoveUp, MoveDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type WorkflowType = 'rota' | 'payroll' | 'leave' | 'expenses' | 'time_off' | 'other';
type ApprovalRole = 'Manager' | 'Area Manager' | 'Regional Manager' | 'Operations Manager' | 'Finance Manager' | 'HR Manager' | 'Owner' | 'Admin' | 'Super Admin';

interface ApprovalWorkflow {
  id: string;
  name: string;
  type: WorkflowType;
  description?: string;
  is_active: boolean;
  steps?: ApprovalStep[];
}

interface ApprovalStep {
  id: string;
  workflow_id: string;
  step_order: number; // Changed from step_number
  step_name: string; // Added (required field)
  approver_role: ApprovalRole;
  is_required: boolean; // Changed from required
  can_approve_multiple?: string[]; // Optional field from DB
  auto_approve_after_hours?: number; // Optional field from DB
}

export default function ApprovalWorkflowsPage() {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  
  // Form states
  const [workflowName, setWorkflowName] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowType>('rota');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowIsActive, setWorkflowIsActive] = useState(true);
  const [workflowSteps, setWorkflowSteps] = useState<Omit<ApprovalStep, 'id' | 'workflow_id' | 'step_order'>[]>([]);

  const workflowTypes: { value: WorkflowType; label: string }[] = [
    { value: 'rota', label: 'Rota/Schedule' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'leave', label: 'Leave Requests' },
    { value: 'expenses', label: 'Expenses' },
    { value: 'time_off', label: 'Time Off' },
    { value: 'other', label: 'Other' },
  ];

  const approverRoles: ApprovalRole[] = [
    'Manager',
    'Area Manager',
    'Regional Manager',
    'Operations Manager',
    'Finance Manager',
    'HR Manager',
    'Owner',
    'Admin',
    'Super Admin',
  ];

  useEffect(() => {
    if (profile?.company_id) {
      loadWorkflows();
    }
  }, [profile]);

  async function loadWorkflows() {
    try {
      setLoading(true);

      if (!profile?.company_id) {
        console.error('No company_id found in profile');
        toast.error('Unable to load workflows: No company ID');
        return;
      }

      const { data: workflowsData, error: workflowsError } = await supabase
        .from('approval_workflows')
        .select('id, name, type, description, is_active')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });

      if (workflowsError) {
        console.error('Error loading workflows:', workflowsError);
        console.error('Error details:', {
          message: workflowsError.message,
          details: workflowsError.details,
          hint: workflowsError.hint,
          code: workflowsError.code,
        });
        
        // Check for specific error types
        if (workflowsError.code === '42P01' || workflowsError.message?.includes('does not exist')) {
          toast.error('Approval workflows table not found. Please run the database migration: 20250221000001_create_approval_hierarchy.sql');
        } else if (workflowsError.code === '42703' || workflowsError.message?.includes('does not exist')) {
          // Column doesn't exist - schema mismatch
          toast.error('Database schema mismatch. Please run migration: 20250320000002_fix_approval_workflows_schema.sql');
        } else if (workflowsError.code === 'PGRST301' || workflowsError.message?.includes('permission denied')) {
          toast.error('Permission denied. Please check your RLS policies.');
        } else {
          toast.error(`Failed to load workflows: ${workflowsError.message || 'Unknown error'}`);
        }
        
        throw workflowsError;
      }

      // Load steps for each workflow
      const workflowIds = (workflowsData || []).map(w => w.id);
      let stepsData: any[] = [];
      
      if (workflowIds.length > 0) {
        const { data: steps, error: stepsError } = await supabase
          .from('approval_steps')
          .select('*')
          .in('workflow_id', workflowIds)
          .order('step_order', { ascending: true });
        
        if (stepsError) {
          // Only log if error object has meaningful information
          const hasErrorInfo = stepsError.message || stepsError.code || stepsError.details || stepsError.hint;
          if (hasErrorInfo) {
            console.error('Error loading approval steps:', {
              message: stepsError.message,
              code: stepsError.code,
              details: stepsError.details,
              hint: stepsError.hint,
            });
            
            // Provide user-friendly error messages for specific error types
            if (stepsError.code === '42P01' || stepsError.message?.includes('does not exist')) {
              toast.error('Approval steps table not found. Please run the database migration.');
            } else if (stepsError.code === 'PGRST301' || stepsError.message?.includes('permission denied')) {
              toast.error('Permission denied when loading approval steps. Please check your RLS policies.');
            }
          }
          // Don't throw - just continue without steps (workflows will load but without step data)
        } else {
          stepsData = steps || [];
        }
      }

      const workflowsWithSteps = (workflowsData || []).map(workflow => ({
        ...workflow,
        steps: stepsData
          .filter(step => step.workflow_id === workflow.id)
          .sort((a, b) => a.step_order - b.step_order),
      }));

      setWorkflows(workflowsWithSteps);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load approval workflows');
    } finally {
      setLoading(false);
    }
  }

  async function saveWorkflow() {
    // Debug logging to see what values we have
    console.log('🔍 saveWorkflow - Current state:', {
      workflowName,
      workflowType,
      workflowDescription,
      workflowIsActive,
      workflowSteps: workflowSteps.length,
      profileCompanyId: profile?.company_id,
    });

    // Validate workflow name - ensure it's not empty
    const trimmedName = workflowName.trim();
    if (!trimmedName || trimmedName === '') {
      console.error('❌ workflowName is empty:', workflowName);
      toast.error('Workflow name is required');
      return;
    }
    
    console.log('✅ workflowName validation passed:', trimmedName);

    if (!workflowType) {
      console.error('❌ workflowType is undefined or empty:', workflowType);
      toast.error('Workflow type is required');
      return;
    }

    if (workflowSteps.length === 0) {
      toast.error('Add at least one approval step');
      return;
    }
    
    // Validate all steps have required fields
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const stepName = (step.step_name || '').trim();
      if (!stepName) {
        toast.error(`Step ${i + 1} must have a name`);
        return;
      }
      if (!step.approver_role) {
        toast.error(`Step ${i + 1} must have an approver role`);
        return;
      }
    }

    if (!profile?.company_id) {
      console.error('❌ profile.company_id is undefined');
      toast.error('Company ID is missing');
      return;
    }

    try {
      if (editingWorkflow) {
        // Update existing workflow - ensure workflowType has a value
        // Triple-check: state value, fallback, and explicit validation
        let finalWorkflowType: WorkflowType = 'rota'; // Default fallback
        
        if (workflowType && workflowType.trim() !== '') {
          finalWorkflowType = workflowType as WorkflowType;
        } else {
          console.warn('⚠️ workflowType is empty/null, using default "rota"');
          finalWorkflowType = 'rota';
        }
        
        // Validate it's a valid WorkflowType
        const validTypes: WorkflowType[] = ['rota', 'payroll', 'leave', 'expenses', 'time_off', 'other'];
        if (!validTypes.includes(finalWorkflowType)) {
          console.error('❌ Invalid workflowType:', finalWorkflowType, 'defaulting to "rota"');
          finalWorkflowType = 'rota';
        }
        
        // Build update data - database columns are 'workflow_name' and 'workflow_type'
        const trimmedName = workflowName.trim();
        
        // CRITICAL: Validate name is not empty
        if (!trimmedName || trimmedName === '') {
          console.error('❌ CRITICAL: workflowName is empty after trim!');
          console.error('❌ Original workflowName:', workflowName);
          toast.error('Workflow name cannot be empty');
          return;
        }
        
        // Database column is 'name' (per schema migration)
        const updateData = {
          name: trimmedName, // Only this, no workflow_name
          type: finalWorkflowType,
          description: workflowDescription.trim() || null,
          is_active: workflowIsActive,
        };
        
        console.log('✅ Update data:', { name: trimmedName, type: finalWorkflowType });
        
        console.log('💾 Updating workflow with:', JSON.stringify(updateData, null, 2));
        console.log('🔍 Type check - workflowType state:', workflowType, 'finalWorkflowType:', finalWorkflowType);
        console.log('🔍 Update data type value:', updateData.type);
        console.log('🔍 Update data name value:', updateData.name);
        console.log('🔍 Type of updateData.type:', typeof updateData.type);
        console.log('🔍 Is type null?', updateData.type === null);
        console.log('🔍 Is type undefined?', updateData.type === undefined);
        console.log('🔍 Is type empty string?', updateData.type === '');
        
        // Final validation before update - STRICT check
        if (!updateData.type || updateData.type === null || updateData.type === undefined || updateData.type === '') {
          console.error('❌ CRITICAL: type is still null/undefined/empty after all checks!');
          console.error('❌ Full updateData:', updateData);
          toast.error('Workflow type is required. Please select a type.');
          return;
        }
        
        if (!updateData.name || updateData.name === null || updateData.name === undefined || updateData.name === '') {
          console.error('❌ CRITICAL: name is still null/undefined/empty after all checks!');
          console.error('❌ Full updateData:', updateData);
          toast.error('Workflow name cannot be empty');
          return;
        }
        
        console.log('🚀 About to update workflow with data:', JSON.stringify(updateData, null, 2));
        console.log('🚀 Update data keys:', Object.keys(updateData));
        console.log('🚀 Update data values:', Object.values(updateData));
        
        const { error: workflowError } = await supabase
          .from('approval_workflows')
          .update(updateData)
          .eq('id', editingWorkflow.id);

        if (workflowError) {
          console.error('❌ Supabase update error:', workflowError);
          console.error('❌ Error code:', workflowError.code);
          console.error('❌ Error message:', workflowError.message);
          console.error('❌ Error details:', workflowError.details);
          console.error('❌ Error hint:', workflowError.hint);
          throw workflowError;
        }
        
        console.log('✅ Workflow updated successfully');

        // Delete old steps
        await supabase
          .from('approval_steps')
          .delete()
          .eq('workflow_id', editingWorkflow.id);

        // Insert new steps
        const stepsToInsert = workflowSteps.map((step, index) => {
          const stepName = (step.step_name || `Step ${index + 1}`).trim();
          if (!stepName) {
            throw new Error(`Step ${index + 1} name cannot be empty`);
          }
          return {
            workflow_id: editingWorkflow.id,
            step_order: index + 1, // Changed from step_number
            step_name: stepName, // Added (required field)
            approver_role: step.approver_role,
            is_required: step.is_required ?? true, // Changed from required, default to true
            // removed can_reject - doesn't exist in DB
          };
        });

        console.log('🚀 Updating steps:', JSON.stringify(stepsToInsert, null, 2));
        
        const { data: insertedSteps, error: stepsError } = await supabase
          .from('approval_steps')
          .insert(stepsToInsert)
          .select();

        if (stepsError) {
          console.error('❌ Supabase steps update error:', stepsError);
          console.error('❌ Steps error code:', stepsError.code);
          console.error('❌ Steps error message:', stepsError.message);
          console.error('❌ Steps error details:', stepsError.details);
          console.error('❌ Steps error hint:', stepsError.hint);
          throw stepsError;
        }
        
        console.log('✅ Steps updated successfully:', insertedSteps);

        toast.success('Workflow updated successfully');
      } else {
        // Create new workflow - ensure workflowType has a value
        // Triple-check: state value, fallback, and explicit validation
        let finalWorkflowType: WorkflowType = 'rota'; // Default fallback
        
        if (workflowType && workflowType.trim() !== '') {
          finalWorkflowType = workflowType as WorkflowType;
        } else {
          console.warn('⚠️ workflowType is empty/null, using default "rota"');
          finalWorkflowType = 'rota';
        }
        
        // Validate it's a valid WorkflowType
        const validTypes: WorkflowType[] = ['rota', 'payroll', 'leave', 'expenses', 'time_off', 'other'];
        if (!validTypes.includes(finalWorkflowType)) {
          console.error('❌ Invalid workflowType:', finalWorkflowType, 'defaulting to "rota"');
          finalWorkflowType = 'rota';
        }
        
        // Build insert data - database columns are 'workflow_name' and 'workflow_type'
        const trimmedName = workflowName.trim();
        
        // CRITICAL: Validate name is not empty
        if (!trimmedName || trimmedName === '') {
          console.error('❌ CRITICAL: workflowName is empty after trim!');
          console.error('❌ Original workflowName:', workflowName);
          toast.error('Workflow name cannot be empty');
          return;
        }
        
        // Database column is 'name' (per schema migration)
        const insertData = {
          name: trimmedName, // Only this, no workflow_name
          type: finalWorkflowType,
          description: workflowDescription.trim() || null,
          is_active: workflowIsActive,
          company_id: profile!.company_id,
        };
        
        console.log('✅ Insert data:', { name: trimmedName, type: finalWorkflowType });
        
        console.log('💾 Inserting new workflow with:', JSON.stringify(insertData, null, 2));
        console.log('🔍 Type check - workflowType state:', workflowType, 'finalWorkflowType:', finalWorkflowType);
        console.log('🔍 Insert data type value:', insertData.type);
        console.log('🔍 Insert data name value:', insertData.name);
        console.log('🔍 Type of insertData.type:', typeof insertData.type);
        console.log('🔍 Is type null?', insertData.type === null);
        console.log('🔍 Is type undefined?', insertData.type === undefined);
        console.log('🔍 Is type empty string?', insertData.type === '');
        
        // Final validation before insert - STRICT check
        if (!insertData.type || insertData.type === null || insertData.type === undefined || insertData.type === '') {
          console.error('❌ CRITICAL: type is still null/undefined/empty after all checks!');
          console.error('❌ Full insertData:', insertData);
          toast.error('Workflow type is required. Please select a type.');
          return;
        }
        
        if (!insertData.name || insertData.name === null || insertData.name === undefined || insertData.name === '') {
          console.error('❌ CRITICAL: name is still null/undefined/empty after all checks!');
          console.error('❌ Full insertData:', insertData);
          toast.error('Workflow name cannot be empty');
          return;
        }
        
        console.log('🚀 About to insert workflow with data:', JSON.stringify(insertData, null, 2));
        console.log('🚀 Insert data keys:', Object.keys(insertData));
        console.log('🚀 Insert data values:', Object.values(insertData));
        
        const { data: newWorkflow, error: workflowError } = await supabase
          .from('approval_workflows')
          .insert(insertData)
          .select()
          .single();

        if (workflowError) {
          console.error('❌ Supabase insert error:', workflowError);
          console.error('❌ Error code:', workflowError.code);
          console.error('❌ Error message:', workflowError.message);
          console.error('❌ Error details:', workflowError.details);
          console.error('❌ Error hint:', workflowError.hint);
          throw workflowError;
        }
        
        console.log('✅ Workflow inserted successfully:', newWorkflow);

        // Insert steps
        const stepsToInsert = workflowSteps.map((step, index) => {
          const stepName = (step.step_name || `Step ${index + 1}`).trim();
          if (!stepName) {
            throw new Error(`Step ${index + 1} name cannot be empty`);
          }
          return {
            workflow_id: newWorkflow.id,
            step_order: index + 1, // Changed from step_number
            step_name: stepName, // Added (required field)
            approver_role: step.approver_role,
            is_required: step.is_required ?? true, // Changed from required, default to true
            // removed can_reject - doesn't exist in DB
          };
        });

        console.log('🚀 Inserting steps:', JSON.stringify(stepsToInsert, null, 2));
        
        const { data: insertedSteps, error: stepsError } = await supabase
          .from('approval_steps')
          .insert(stepsToInsert)
          .select();

        if (stepsError) {
          console.error('❌ Supabase steps insert error:', stepsError);
          console.error('❌ Steps error code:', stepsError.code);
          console.error('❌ Steps error message:', stepsError.message);
          console.error('❌ Steps error details:', stepsError.details);
          console.error('❌ Steps error hint:', stepsError.hint);
          throw stepsError;
        }
        
        console.log('✅ Steps inserted successfully:', insertedSteps);

        toast.success('Workflow created successfully');
      }

      closeModal();
      loadWorkflows();
    } catch (error: any) {
      console.error('❌ Error saving workflow:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error?.constructor?.name);
      
      // Log all error properties
      if (error) {
        console.error('❌ Error keys:', Object.keys(error));
        console.error('❌ Error properties:', Object.getOwnPropertyNames(error));
        for (const key in error) {
          console.error(`❌ Error.${key}:`, error[key]);
        }
      }
      
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error details:', error?.details);
      console.error('❌ Error hint:', error?.hint);
      
      // Try to stringify, but handle errors
      try {
        const errorString = JSON.stringify(error, (key, value) => {
          if (key === 'stack') return undefined; // Skip stack trace
          return value;
        }, 2);
        console.error('❌ Full error object:', errorString);
      } catch (stringifyError) {
        console.error('❌ Could not stringify error:', stringifyError);
        console.error('❌ Error toString:', error?.toString());
      }
      
      // Show more specific error message
      const errorMessage = error?.message || error?.details || 'Unknown error occurred';
      toast.error(`Failed to save workflow: ${errorMessage}`);
    }
  }

  async function deleteWorkflow(workflowId: string) {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('approval_workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;
      toast.success('Workflow deleted successfully');
      loadWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  }

  function openEditWorkflow(workflow: ApprovalWorkflow) {
    setEditingWorkflow(workflow);
    setWorkflowName(workflow.name);
    setWorkflowType(workflow.type);
    setWorkflowDescription(workflow.description || '');
    setWorkflowIsActive(workflow.is_active);
    setWorkflowSteps(
      (workflow.steps || []).map(step => ({
        step_name: step.step_name || `Step ${step.step_order}`, // Added
        approver_role: step.approver_role,
        is_required: step.is_required, // Changed from required
        // removed can_reject - doesn't exist in DB
      }))
    );
    setShowWorkflowModal(true);
  }

  function openNewWorkflow() {
    // Reset all form state to defaults
    setEditingWorkflow(null);
    setWorkflowName('');
    setWorkflowType('rota'); // Explicitly set default
    setWorkflowDescription('');
    setWorkflowIsActive(true);
    setWorkflowSteps([]);
    setShowWorkflowModal(true);
    console.log('📝 Opening new workflow modal, workflowType initialized to:', 'rota');
  }

  function closeModal() {
    setShowWorkflowModal(false);
    setEditingWorkflow(null);
    setWorkflowName('');
    setWorkflowType('rota'); // Reset to default
    setWorkflowDescription('');
    setWorkflowIsActive(true);
    setWorkflowSteps([]);
  }

  function addStep() {
    setWorkflowSteps([
      ...workflowSteps,
      {
        step_name: `Step ${workflowSteps.length + 1}`, // Added (required field)
        approver_role: 'Manager',
        is_required: true, // Changed from required
        // removed can_reject - doesn't exist in DB
      },
    ]);
  }

  function removeStep(index: number) {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index));
  }

  function moveStepUp(index: number) {
    if (index === 0) return;
    const newSteps = [...workflowSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setWorkflowSteps(newSteps);
  }

  function moveStepDown(index: number) {
    if (index === workflowSteps.length - 1) return;
    const newSteps = [...workflowSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setWorkflowSteps(newSteps);
  }

  function updateStep(index: number, field: keyof Omit<ApprovalStep, 'id' | 'workflow_id' | 'step_order'>, value: any) {
    const newSteps = [...workflowSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setWorkflowSteps(newSteps);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EC4899] mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading approval workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/people/settings"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Approval Workflows</h1>
          <p className="text-neutral-400">
            Configure multi-level approval processes for rota, payroll, leave, and more
          </p>
        </div>
        <Button onClick={openNewWorkflow}>
          <Plus className="w-4 h-4 mr-2" />
          Add Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[#EC4899]/20 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5 text-[#EC4899]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        workflow.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-neutral-500/20 text-neutral-400'
                      }`}
                    >
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mb-2">
                    {workflowTypes.find(t => t.value === workflow.type)?.label}
                  </p>
                  {workflow.description && (
                    <p className="text-sm text-neutral-500 mb-3">{workflow.description}</p>
                  )}
                  
                  {/* Steps */}
                  <div className="space-y-2">
                    {workflow.steps?.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-[#EC4899]/20 text-[#EC4899] flex items-center justify-center text-xs font-medium">
                          {step.step_order}
                        </span>
                        <span className="text-white">{step.step_name || `Step ${step.step_order}`}</span>
                        <span className="text-white">{step.approver_role}</span>
                        {step.is_required && (
                          <span className="text-xs text-red-400">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditWorkflow(workflow)}
                  className="p-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {workflows.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <GitBranch className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">No approval workflows defined yet</p>
            <Button onClick={openNewWorkflow}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        )}
      </div>

      {/* Workflow Modal */}
      {showWorkflowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0B0D13] border border-white/[0.06] rounded-lg max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingWorkflow ? 'Edit Workflow' : 'Add Workflow'}
              </h2>
              <button onClick={closeModal} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                    placeholder="e.g., Rota Approval Process"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Workflow Type *
                  </label>
                  <Select
                    value={workflowType || 'rota'}
                    onValueChange={(val) => {
                      console.log('🔍 Select onValueChange called with:', val, 'current workflowType:', workflowType);
                      if (val && val !== '') {
                        setWorkflowType(val as WorkflowType);
                      } else {
                        // Fallback to default if somehow undefined or empty
                        console.warn('⚠️ Select returned undefined/empty, using default "rota"');
                        setWorkflowType('rota');
                      }
                    }}
                    options={workflowTypes.map((type) => ({
                      label: type.label,
                      value: type.value,
                    }))}
                    placeholder="Select workflow type"
                  />
                  {!workflowType && (
                    <p className="text-xs text-red-400 mt-1">⚠️ Workflow type is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                    rows={2}
                    placeholder="Brief description of this workflow"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={workflowIsActive}
                    onChange={(e) => setWorkflowIsActive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm text-neutral-300">
                    Workflow is active
                  </label>
                </div>
              </div>

              {/* Approval Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-300">
                    Approval Steps *
                  </label>
                  <Button onClick={addStep} size="sm">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Step
                  </Button>
                </div>

                <div className="space-y-3">
                  {workflowSteps.map((step, index) => (
                    <div
                      key={index}
                      className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#EC4899]/20 text-[#EC4899] flex items-center justify-center text-sm font-medium flex-shrink-0 mt-1">
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">
                              Step Name *
                            </label>
                            <input
                              type="text"
                              value={step.step_name || ''}
                              onChange={(e) =>
                                updateStep(index, 'step_name', e.target.value)
                              }
                              placeholder={`Step ${index + 1}`}
                              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC4899]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">
                              Approver Role
                            </label>
                            <Select
                              value={step.approver_role}
                              onValueChange={(val) =>
                                updateStep(index, 'approver_role', val)
                              }
                              options={approverRoles.map((role) => ({
                                label: role,
                                value: role,
                              }))}
                              placeholder="Select role"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs text-neutral-400">
                              <input
                                type="checkbox"
                                checked={step.is_required ?? true}
                                onChange={(e) =>
                                  updateStep(index, 'is_required', e.target.checked)
                                }
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveStepUp(index)}
                            disabled={index === 0}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveStepDown(index)}
                            disabled={index === workflowSteps.length - 1}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStep(index)}
                            className="p-1 text-neutral-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {workflowSteps.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-lg">
                      <p className="text-sm text-neutral-500">
                        No approval steps yet. Click "Add Step" to get started.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={saveWorkflow} className="flex-1">
                  {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
                </Button>
                <Button variant="outline" onClick={closeModal} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

