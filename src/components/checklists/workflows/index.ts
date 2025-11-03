/**
 * Workflow Router
 * Routes task completion to appropriate workflow handler based on template workflowType
 */

import type { ComplianceTemplate } from '@/data/compliance-templates'
import { escalateMeasurement, type MeasurementEscalationParams, type EscalationResult } from './measurement-escalate'
import { escalateInspection, type InspectionEscalationParams, type InspectionEscalationResult } from './inspection-escalate'
import { handleChecklistVerify, type ChecklistVerifyParams, type ChecklistVerifyResult } from './checklist-verify'
import { handleDocumentTrack, type DocumentTrackParams, type DocumentTrackResult } from './document-track'
import { handleSimpleConfirm, type SimpleConfirmParams, type SimpleConfirmResult } from './simple-confirm'

export type WorkflowResult = EscalationResult | InspectionEscalationResult | ChecklistVerifyResult | DocumentTrackResult | SimpleConfirmResult

export interface WorkflowContext {
  template: ComplianceTemplate
  formData: Record<string, any>
  photoUrls: string[]
  companyId: string
  siteId: string
  userId: string
  taskId: string
  assetId?: string | null
  assetName?: string | null
  assetMinTemp?: number | null
  assetMaxTemp?: number | null
  measuredValue?: number
  inspectionResult?: 'pass' | 'fail'
  durationMinutes?: number
}

/**
 * Route task completion to appropriate workflow handler
 */
export async function handleWorkflow(context: WorkflowContext): Promise<WorkflowResult> {
  const { template, workflowType } = context
  
  // Default to 'measurement' if workflowType not set (backward compatibility)
  const workflow = (template as any).workflowType || 'measurement'

  switch (workflow) {
    case 'measurement':
    case 'measurement_escalate': {
      if (!context.assetId || context.measuredValue === undefined) {
        return {
          success: false,
          action: null,
          message: 'Missing asset ID or measurement value for measurement workflow'
        }
      }

      const params: MeasurementEscalationParams = {
        template,
        assetId: context.assetId,
        assetName: context.assetName || 'Equipment',
        measuredValue: context.measuredValue,
        assetMinTemp: context.assetMinTemp ?? null,
        assetMaxTemp: context.assetMaxTemp ?? null,
        companyId: context.companyId,
        siteId: context.siteId,
        userId: context.userId,
        taskId: context.taskId
      }

      return await escalateMeasurement(params, context.durationMinutes)
    }

    case 'inspection':
    case 'inspection_escalate': {
      const params: InspectionEscalationParams = {
        template,
        assetId: context.assetId ?? null,
        assetName: context.assetName ?? null,
        inspectionResult: context.inspectionResult || (context.formData.status === 'pass' ? 'pass' : 'fail'),
        failureReason: context.formData.failure_reason || context.formData.notes,
        companyId: context.companyId,
        siteId: context.siteId,
        userId: context.userId,
        taskId: context.taskId
      }

      return await escalateInspection(params, context.durationMinutes)
    }

    case 'checklist_verify': {
      const params: ChecklistVerifyParams = {
        template,
        formData: context.formData,
        photoUrls: context.photoUrls,
        companyId: context.companyId,
        siteId: context.siteId,
        userId: context.userId,
        taskId: context.taskId
      }

      return await handleChecklistVerify(params)
    }

    case 'document_track': {
      const params: DocumentTrackParams = {
        template,
        formData: context.formData,
        companyId: context.companyId,
        siteId: context.siteId,
        userId: context.userId,
        taskId: context.taskId
      }

      return await handleDocumentTrack(params)
    }

    case 'simple_confirm': {
      const params: SimpleConfirmParams = {
        template,
        formData: context.formData,
        companyId: context.companyId,
        siteId: context.siteId,
        userId: context.userId,
        taskId: context.taskId
      }

      return await handleSimpleConfirm(params)
    }

    default:
      return {
        success: false,
        message: `Unknown workflow type: ${workflow}`
      }
  }
}

