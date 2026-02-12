'use client'

// ============================================================================
// CertificateTaskModal - Handle Certificate Expiry Tasks
// ============================================================================
// Task-aware modal for handling certificate expiry tasks from Today's Tasks
// Allows managers to:
// 1. View certificate details (employee, type, current expiry)
// 2. Update the expiry date when certificate is renewed
// 3. Optionally book training if certificate needs renewal
//
// Writes to training_records (single source of truth).
// DB trigger syncs changes back to profile cert fields automatically.
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, Award, AlertCircle, Loader2, User, Clock, ExternalLink } from '@/components/ui/icons'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface CertificateTaskModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

// Certificate type labels
const CERTIFICATE_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  h_and_s: 'Health & Safety',
  fire_marshal: 'Fire Marshal',
  first_aid: 'First Aid',
  cossh: 'COSHH',
}

// Map certificate_type from task_data → training_courses.code
const CERT_TYPE_TO_COURSE_CODE: Record<string, string | ((level?: number) => string)> = {
  food_safety: (level?: number) => (level && level >= 3) ? 'FS-L3' : 'FS-L2',
  h_and_s: 'HS-L2',
  fire_marshal: 'FIRE',
  first_aid: 'FAW',
  cossh: 'COSHH',
}

export default function CertificateTaskModal({
  task,
  isOpen,
  onClose,
  onComplete
}: CertificateTaskModalProps) {
  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<any>(null)

  // Form state
  const [newExpiryDate, setNewExpiryDate] = useState('')

  // Extract task data
  const taskData = task.task_data as Record<string, any> | null
  const sourceType = taskData?.source_type
  const certificateType = taskData?.certificate_type || ''
  const profileId = taskData?.profile_id
  const currentExpiry = taskData?.expiry_date
  const daysUntilExpiry = taskData?.days_until_expiry
  const level = taskData?.level

  // training_certificate tasks come from training_records and carry course_id + course_name directly
  const isTrainingRecord = sourceType === 'training_certificate'
  const courseId = taskData?.course_id as string | undefined
  const courseName = taskData?.course_name as string | undefined

  const isNoExpiry = sourceType === 'certificate_no_expiry'
  const certificateLabel = isTrainingRecord
    ? (courseName || 'Training Certificate')
    : (CERTIFICATE_LABELS[certificateType] || certificateType)

  // Load employee data
  useEffect(() => {
    if (!isOpen || !profileId) return

    const loadEmployee = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, company_id')
          .eq('id', profileId)
          .single()

        if (profileError) throw profileError

        setEmployee(data)

        // Pre-fill with suggested renewal date (1 year from now for most certs)
        const suggestedDate = new Date()
        suggestedDate.setFullYear(suggestedDate.getFullYear() + 1)
        setNewExpiryDate(suggestedDate.toISOString().split('T')[0])

      } catch (err) {
        console.error('Error loading employee:', err)
        setError(err instanceof Error ? err.message : 'Failed to load employee data')
      } finally {
        setLoading(false)
      }
    }

    loadEmployee()
  }, [isOpen, profileId])

  const handleUpdateExpiry = async () => {
    if (!newExpiryDate || !profileId || !employee?.company_id) return

    try {
      setSubmitting(true)
      setError(null)

      // Resolve course ID - training_certificate tasks already have it, profile-based tasks need lookup
      let resolvedCourseId: string

      if (isTrainingRecord && courseId) {
        resolvedCourseId = courseId
      } else {
        // Resolve course code from certificate_type
        const codeResolver = CERT_TYPE_TO_COURSE_CODE[certificateType]
        if (!codeResolver) throw new Error(`Unknown certificate type: ${certificateType}`)
        const courseCode = typeof codeResolver === 'function' ? codeResolver(level) : codeResolver

        // Look up the course
        const { data: course, error: courseError } = await supabase
          .from('training_courses')
          .select('id')
          .eq('company_id', employee.company_id)
          .eq('code', courseCode)
          .single()

        if (courseError || !course) {
          throw new Error(`Training course not found for code: ${courseCode}`)
        }
        resolvedCourseId = course.id
      }

      // Get current user for recorded_by
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use complete_training() RPC - handles upsert
      const { error: rpcError } = await supabase.rpc('complete_training', {
        p_profile_id: profileId,
        p_course_id: resolvedCourseId,
        p_completed_at: new Date().toISOString().split('T')[0],
        p_score: null,
        p_certificate_number: null,
        p_expiry_date: newExpiryDate,
        p_recorded_by: user.id,
      })

      if (rpcError) throw rpcError

      // Complete the task
      await completeTask()

    } catch (err) {
      console.error('Error updating certificate:', err)
      setError(err instanceof Error ? err.message : 'Failed to update certificate')
      setSubmitting(false)
    }
  }

  const completeTask = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Not authenticated')

    const { error: taskError } = await supabase
      .from('checklist_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id
      })
      .eq('id', task.id)

    if (taskError) throw taskError

    onComplete()
    onClose()
  }

  if (!isOpen) return null

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl p-8 border border-white/[0.08]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-theme-tertiary text-sm">Loading certificate details...</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (no employee found)
  if (error && !employee) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Error Loading Certificate</h3>
          <p className="text-theme-tertiary mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Calculate urgency
  const isExpired = daysUntilExpiry !== undefined && daysUntilExpiry < 0
  const isUrgent = daysUntilExpiry !== undefined && daysUntilExpiry <= 7
  const isWarning = daysUntilExpiry !== undefined && daysUntilExpiry <= 14

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/[0.08]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isExpired ? 'bg-red-500/20' : isUrgent ? 'bg-amber-500/20' : 'bg-amber-500/10'}`}>
              <Award className={`w-5 h-5 ${isExpired ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">
                {isNoExpiry ? 'Set Certificate Expiry' : 'Certificate Renewal'}
              </h2>
              <p className="text-sm text-theme-tertiary">{certificateLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Info */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                {employee?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="text-theme-primary font-medium">{employee?.full_name || 'Unknown Employee'}</div>
                <div className="text-sm text-theme-tertiary">{employee?.email}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-theme-tertiary mb-1">Certificate Type</div>
                <div className="text-theme-primary font-medium">{certificateLabel}</div>
              </div>
              {level && (
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Level</div>
                  <div className="text-theme-primary font-medium">Level {level}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-theme-tertiary mb-1">Current Expiry</div>
                <div className={`font-medium ${isExpired ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-theme-primary'}`}>
                  {currentExpiry ? new Date(currentExpiry).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-xs text-theme-tertiary mb-1">Status</div>
                <div className={`font-medium ${isExpired ? 'text-red-400' : isUrgent ? 'text-amber-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>
                  {isNoExpiry ? 'No expiry set' : isExpired ? 'EXPIRED' : daysUntilExpiry !== undefined ? `${daysUntilExpiry} days remaining` : 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Alert for expired/urgent */}
          {(isExpired || isUrgent) && !isNoExpiry && (
            <div className={`p-4 rounded-lg border ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${isExpired ? 'text-red-400' : 'text-amber-400'}`} />
                <div>
                  <div className={`font-medium ${isExpired ? 'text-red-400' : 'text-amber-400'}`}>
                    {isExpired ? 'Certificate Expired' : 'Certificate Expiring Soon'}
                  </div>
                  <div className="text-sm text-theme-tertiary mt-1">
                    {isExpired
                      ? 'This certificate has expired. Please update with the new expiry date once renewed.'
                      : 'This certificate will expire soon. Update the expiry date when the certificate is renewed.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Update Expiry Form */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <h3 className="text-theme-primary font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              {isNoExpiry ? 'Set Expiry Date' : 'Update Expiry Date'}
            </h3>
            <p className="text-sm text-theme-tertiary mb-4">
              {isNoExpiry
                ? 'Enter the expiry date for this certificate.'
                : 'Enter the new expiry date from the renewed certificate.'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-theme-tertiary mb-2">New Expiry Date</label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-xs text-theme-tertiary mt-1">
                  Select the expiry date shown on the renewed certificate
                </p>
              </div>

              <button
                onClick={handleUpdateExpiry}
                disabled={!newExpiryDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    {isNoExpiry ? 'Set Expiry & Complete Task' : 'Update Expiry & Complete Task'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-theme-tertiary hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
