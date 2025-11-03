/**
 * Document Track Workflow
 * For certificate/document expiry tracking
 */

import { supabase } from '@/lib/supabase'
import type { ComplianceTemplate } from '@/data/compliance-templates'

export interface DocumentTrackParams {
  template: ComplianceTemplate
  formData: Record<string, any>
  companyId: string
  siteId: string
  userId: string
  taskId: string
}

export interface DocumentTrackResult {
  success: boolean
  message: string
  expiryDate?: string
  isExpired?: boolean
  daysUntilExpiry?: number
}

/**
 * Track document expiry and create alerts if needed
 */
export async function handleDocumentTrack(
  params: DocumentTrackParams
): Promise<DocumentTrackResult> {
  const { template, formData, companyId, siteId, userId } = params
  
  const trackingRules = template.workflowConfig?.trackingRules || {}
  const expiryWarningDays = trackingRules.expiryWarningDays || 30
  
  // Get expiry date from form data
  const expiryDate = formData.expiry_date || formData.expiryDate || formData.valid_until
  if (!expiryDate) {
    return {
      success: false,
      message: 'Expiry date is required for document tracking'
    }
  }
  
  const expiry = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysUntilExpiry < 0
  const isWarning = daysUntilExpiry > 0 && daysUntilExpiry <= expiryWarningDays
  
  // Create notification if expired or expiring soon
  if (isExpired || isWarning) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const severity = isExpired ? 'critical' : 'warning'
        const message = isExpired
          ? `Document "${template.name}" has expired on ${expiryDate}. Immediate action required.`
          : `Document "${template.name}" expires in ${daysUntilExpiry} days (${expiryDate}). Review required.`
        
        await supabase
          .from('notifications')
          .insert({
            company_id: companyId,
            site_id: siteId,
            type: 'document',
            title: isExpired ? 'Document Expired' : 'Document Expiring Soon',
            message,
            severity,
            recipient_role: 'manager',
            status: 'active'
          })
      }
    } catch (error) {
      console.error('Error creating document expiry notification:', error)
      // Don't fail the task completion if notification fails
    }
  }

  return {
    success: true,
    message: isExpired 
      ? 'Document tracked - EXPIRED' 
      : isWarning 
        ? `Document tracked - expires in ${daysUntilExpiry} days`
        : 'Document tracked successfully',
    expiryDate: expiryDate,
    isExpired,
    daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0
  }
}

