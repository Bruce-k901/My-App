/**
 * Measurement Escalation Workflow
 * Handles escalation logic for measurement-based tasks (e.g., temperature checks)
 */

import { supabase } from '@/lib/supabase'
import type { ComplianceTemplate } from '@/data/compliance-templates'

export interface MeasurementEscalationParams {
  template: ComplianceTemplate
  assetId: string
  assetName: string
  measuredValue: number
  assetMinTemp: number | null
  assetMaxTemp: number | null
  companyId: string
  siteId: string
  userId: string
  taskId: string
}

export interface EscalationResult {
  success: boolean
  action: 'monitor' | 'callout' | null
  monitoringTaskId?: string
  calloutId?: string
  message: string
}

/**
 * Check if a measurement value is out of acceptable range
 */
export function isOutOfRange(
  value: number,
  min: number | null,
  max: number | null,
  thresholds?: { warning?: number; critical?: number }
): { isOutOfRange: boolean; severity: 'ok' | 'warning' | 'critical' } {
  if (min === null && max === null) {
    return { isOutOfRange: false, severity: 'ok' }
  }

  const warningThreshold = thresholds?.warning || 2
  const criticalThreshold = thresholds?.critical || 5

  // Check if below minimum
  if (min !== null && value < min) {
    const diff = min - value
    if (diff >= criticalThreshold) {
      return { isOutOfRange: true, severity: 'critical' }
    } else if (diff >= warningThreshold) {
      return { isOutOfRange: true, severity: 'warning' }
    }
  }

  // Check if above maximum
  if (max !== null && value > max) {
    const diff = value - max
    if (diff >= criticalThreshold) {
      return { isOutOfRange: true, severity: 'critical' }
    } else if (diff >= warningThreshold) {
      return { isOutOfRange: true, severity: 'warning' }
    }
  }

  return { isOutOfRange: false, severity: 'ok' }
}

/**
 * Create a monitoring task for follow-up measurement
 */
async function createMonitoringTask(
  params: MeasurementEscalationParams,
  durationMinutes: number
): Promise<string> {
  const { companyId, siteId, userId, taskId, template } = params

  // Calculate due time (current time + duration)
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
 * Create a contractor callout
 */
async function createCallout(params: MeasurementEscalationParams): Promise<string> {
  const { companyId, siteId, template, assetId, assetName, measuredValue } = params

  // Get asset details to find contractor
  const { data: asset } = await supabase
    .from('assets')
    .select('reactive_contractor_id, ppm_contractor_id, warranty_contractor_id')
    .eq('id', assetId)
    .single()

  const contractorId = asset?.reactive_contractor_id || 
                      asset?.ppm_contractor_id || 
                      asset?.warranty_contractor_id || 
                      null

  const { data: callout, error } = await supabase
    .from('contractor_callouts')
    .insert({
      company_id: companyId,
      site_id: siteId,
      triggered_by_task_id: params.taskId,
      triggered_by_template_id: template.id,
      contractor_type: template.contractor_type || 'equipment_repair',
      contractor_id: contractorId,
      issue_description: `Temperature out of range on ${assetName}: ${measuredValue}°C`,
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
 * Escalate a measurement-based task based on workflow rules
 */
export async function escalateMeasurement(
  params: MeasurementEscalationParams,
  durationMinutes?: number
): Promise<EscalationResult> {
  const { template, measuredValue, assetMinTemp, assetMaxTemp } = params

  // Check if value is out of range
  const rangeCheck = isOutOfRange(
    measuredValue,
    assetMinTemp,
    assetMaxTemp,
    template.workflowConfig?.escalationRules?.thresholds
  )

  if (!rangeCheck.isOutOfRange) {
    return {
      success: true,
      action: null,
      message: 'Temperature is within acceptable range'
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
    if (outOfRangeAction === 'callout' || rangeCheck.severity === 'critical') {
      // Create callout for critical issues or if configured
      const calloutId = await createCallout(params)
      
      return {
        success: true,
        action: 'callout',
        calloutId,
        message: `Callout created for ${params.assetName} - temperature ${measuredValue}°C is out of range`
      }
    } else if (outOfRangeAction === 'monitor') {
      // Create monitoring task
      const monitoringTaskId = await createMonitoringTask(params, monitoringDuration)
      
      return {
        success: true,
        action: 'monitor',
        monitoringTaskId,
        message: `Monitoring task created - follow-up check scheduled in ${monitoringDuration} minutes`
      }
    }

    return {
      success: false,
      action: null,
      message: 'Unknown escalation action'
    }
  } catch (error) {
    return {
      success: false,
      action: null,
      message: error instanceof Error ? error.message : 'Failed to escalate'
    }
  }
}

