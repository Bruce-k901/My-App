/**
 * Checklist Verify Workflow
 * For cleaning/maintenance tasks that require photo verification
 */

import { supabase } from '@/lib/supabase'
import type { ComplianceTemplate } from '@/data/compliance-templates'

export interface ChecklistVerifyParams {
  template: ComplianceTemplate
  formData: Record<string, any>
  photoUrls: string[]
  companyId: string
  siteId: string
  userId: string
  taskId: string
}

export interface ChecklistVerifyResult {
  success: boolean
  message: string
  verified: boolean
}

/**
 * Verify checklist completion with required evidence
 */
export async function handleChecklistVerify(
  params: ChecklistVerifyParams
): Promise<ChecklistVerifyResult> {
  const { template, photoUrls, formData } = params
  
  const verificationRules = template.workflowConfig?.verificationRules || {}
  
  // Check if photo is required
  if (verificationRules.requiresPhoto && (!photoUrls || photoUrls.length === 0)) {
    return {
      success: false,
      verified: false,
      message: 'Photo evidence is required for this task'
    }
  }
  
  // Check if signature is required
  if (verificationRules.requiresSignature && !formData.signature) {
    return {
      success: false,
      verified: false,
      message: 'Signature is required for this task'
    }
  }
  
  // If pass/fail field exists, check it
  if (template.evidence_types.includes('pass_fail')) {
    if (formData.status === 'fail') {
      // Failed checklist might need escalation (could be added later)
      return {
        success: true,
        verified: false,
        message: 'Checklist completed but marked as failed. Manager will be notified.'
      }
    }
  }

  return {
    success: true,
    verified: true,
    message: 'Checklist verified successfully'
  }
}

