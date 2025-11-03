/**
 * Inspection Escalation Workflow
 * Handles escalation logic for inspection-based tasks (e.g., visual checks, pass/fail)
 */

import { supabase } from '@/lib/supabase'
import type { ComplianceTemplate } from '@/data/compliance-templates'

export interface InspectionEscalationParams {
  template: ComplianceTemplate
  assetId: string | null
  assetName: string | null
  inspectionResult: 'pass' | 'fail'
  failureReason?: string
  companyId: string
  siteId: string
  userId: string
  taskId: string
}

export interface InspectionEscalationResult {
  success: boolean
  action: 'monitor' | 'callout' | null
  monitoringTaskId?: string
  calloutId?: string
  message: string
}

/**
 * Create a monitoring task for follow-up inspection
 */
async function createMonitoringTask(
  params: InspectionEscalationParams,
  durationMinutes: number
): Promise<string> {
  const { companyId, siteId, userId, taskId, template } = params

  const now = new Date()
  const dueTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

  const { data: monitoringTask, error } = await supabase
    .from('checklist_tasks')
    .insert({
      template_id: template.id,
      company_id: companyId,
      site_id: siteId,
      due_date: dueTime.toISOString().split('T')[0],
      due_time: dueTime.toTimeString().slice(0, 5),
      assigned_to_user_id: userId,
      status: 'pending',
      priority: 'high',
      flag_reason: 'monitoring',
      flagged: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create monitoring task: ${error.message}`)
  }

  return monitoringTask.id
}

/**
 * Create a contractor callout for failed inspection
 */
async function createCallout(params: InspectionEscalationParams): Promise<string> {
  const { companyId, siteId, template, assetId, assetName, failureReason, taskId } = params

  // Get asset details to find contractor if asset is specified
  let contractorId = null
  if (assetId) {
    const { data: asset } = await supabase
      .from('assets')
      .select('reactive_contractor_id, ppm_contractor_id, warranty_contractor_id')
      .eq('id', assetId)
      .single()

    contractorId = asset?.reactive_contractor_id || 
                  asset?.ppm_contractor_id || 
                  asset?.warranty_contractor_id || 
                  null
  }

  const issueDescription = assetName
    ? `Inspection failed on ${assetName}: ${failureReason || 'No reason provided'}`
    : `Inspection failed: ${failureReason || 'No reason provided'}`

  const { data: callout, error } = await supabase
    .from('contractor_callouts')
    .insert({
      company_id: companyId,
      site_id: siteId,
      triggered_by_task_id: taskId,
      triggered_by_template_id: template.id,
      contractor_type: template.contractor_type || 'equipment_repair',
      contractor_id: contractorId,
      issue_description: issueDescription,
      priority: 'high',
      status: 'requested',
      requested_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create callout: ${error.message}`)
  }

  return callout.id
}

/**
 * Escalate an inspection-based task based on workflow rules
 */
export async function escalateInspection(
  params: InspectionEscalationParams,
  durationMinutes?: number
): Promise<InspectionEscalationResult> {
  const { template, inspectionResult } = params

  // If inspection passed, no escalation needed
  if (inspectionResult === 'pass') {
    return {
      success: true,
      action: null,
      message: 'Inspection passed - no action required'
    }
  }

  const escalationConfig = template.workflowConfig?.escalationRules
  if (!escalationConfig) {
    return {
      success: false,
      action: null,
      message: 'No escalation rules configured for this template'
    }
  }

  const { outOfRangeAction } = escalationConfig
  const monitoringDuration = durationMinutes || escalationConfig.monitoringDuration || 30

  try {
    // For failed inspections, default to callout unless specifically configured for monitoring
    if (outOfRangeAction === 'monitor') {
      const monitoringTaskId = await createMonitoringTask(params, monitoringDuration)
      
      return {
        success: true,
        action: 'monitor',
        monitoringTaskId,
        message: `Monitoring task created - follow-up inspection scheduled in ${monitoringDuration} minutes`
      }
    } else {
      // Default to callout for failed inspections
      const calloutId = await createCallout(params)
      
      return {
        success: true,
        action: 'callout',
        calloutId,
        message: `Callout created - inspection failed on ${params.assetName || 'equipment'}`
      }
    }
  } catch (error) {
    return {
      success: false,
      action: null,
      message: error instanceof Error ? error.message : 'Failed to escalate'
    }
  }
}

