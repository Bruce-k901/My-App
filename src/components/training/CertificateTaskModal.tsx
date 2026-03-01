'use client'

// ============================================================================
// CertificateTaskModal - Handle Certificate Expiry Tasks
// ============================================================================
// Task-aware modal for handling certificate expiry tasks from Today's Tasks
// Two clear paths:
// 1. Book Training Course (primary) – books a course and auto-completes task
// 2. Update Expiry Date (secondary) – records renewed cert and completes task
// ============================================================================

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, Award, AlertCircle, Loader2, BookOpen, Mail } from '@/components/ui/icons'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import { BookCourseFromTaskModal } from '@/components/training/BookCourseFromTaskModal'

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
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [resolvedCourse, setResolvedCourse] = useState<{ id: string; name: string } | null>(null)

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
  const taskSiteId = task.site_id || taskData?.site_id || null

  // training_certificate tasks come from training_records and carry course_id + course_name directly
  const isTrainingRecord = sourceType === 'training_certificate'
  const courseId = taskData?.course_id as string | undefined
  const courseName = taskData?.course_name as string | undefined

  const isNoExpiry = sourceType === 'certificate_no_expiry'
  const certificateLabel = isTrainingRecord
    ? (courseName || 'Training Certificate')
    : (CERTIFICATE_LABELS[certificateType] || certificateType)

  // Resolve the training course for the book button
  useEffect(() => {
    if (!isOpen || !employee?.company_id) return

    const resolveCourse = async () => {
      try {
        if (isTrainingRecord && courseId && courseName) {
          setResolvedCourse({ id: courseId, name: courseName })
          return
        }

        // Resolve from certificate_type
        const codeResolver = CERT_TYPE_TO_COURSE_CODE[certificateType]
        if (!codeResolver) return
        const courseCode = typeof codeResolver === 'function' ? codeResolver(level) : codeResolver

        const { data: course } = await supabase
          .from('training_courses')
          .select('id, name')
          .eq('company_id', employee.company_id)
          .eq('code', courseCode)
          .maybeSingle()

        if (course) {
          setResolvedCourse({ id: course.id, name: course.name })
        }
      } catch (err) {
        console.error('Error resolving course:', err)
      }
    }

    resolveCourse()
  }, [isOpen, employee?.company_id, isTrainingRecord, courseId, courseName, certificateType, level])

  // Load employee data + current user profile
  useEffect(() => {
    if (!isOpen || !profileId) return

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load employee and current user in parallel
        const { data: { user } } = await supabase.auth.getUser()

        const [employeeResult, profileResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, email, company_id')
            .eq('id', profileId)
            .single(),
          user ? supabase
            .from('profiles')
            .select('id, company_id')
            .eq('auth_user_id', user.id)
            .maybeSingle() : Promise.resolve({ data: null, error: null }),
        ])

        if (employeeResult.error) throw employeeResult.error
        setEmployee(employeeResult.data)

        if (profileResult.data) {
          setCurrentUserProfile(profileResult.data)
        }

        // Pre-fill with suggested renewal date (1 year from now)
        const suggestedDate = new Date()
        suggestedDate.setFullYear(suggestedDate.getFullYear() + 1)
        setNewExpiryDate(suggestedDate.toISOString().split('T')[0])

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, profileId])

  const handleUpdateExpiry = async () => {
    if (!newExpiryDate || !profileId || !employee?.company_id) return

    try {
      setSubmitting(true)
      setError(null)

      // Resolve course ID
      let resolvedCourseId: string

      if (isTrainingRecord && courseId) {
        resolvedCourseId = courseId
      } else {
        const codeResolver = CERT_TYPE_TO_COURSE_CODE[certificateType]
        if (!codeResolver) throw new Error(`Unknown certificate type: ${certificateType}`)
        const courseCode = typeof codeResolver === 'function' ? codeResolver(level) : codeResolver

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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

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
        <div className="bg-theme-surface rounded-xl shadow-2xl p-8 border border-theme">
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
        <div className="bg-theme-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-theme">
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
      <div className="bg-theme-surface rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-theme">

        {/* Header with employee info */}
        <div className="p-5 border-b border-theme">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isExpired ? 'bg-red-500/20' : isUrgent ? 'bg-amber-500/20' : 'bg-amber-500/10'}`}>
                <Award className={`w-5 h-5 ${isExpired ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-theme-primary">
                  {isNoExpiry ? 'Set Certificate Expiry' : 'Certificate Renewal'}
                </h2>
                <p className="text-sm text-theme-tertiary">{certificateLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-theme-tertiary" />
            </button>
          </div>

          {/* Compact employee row */}
          <div className="flex items-center gap-3 bg-theme-muted rounded-lg px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {employee?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-theme-primary font-medium truncate">{employee?.full_name || 'Unknown Employee'}</div>
              <div className="text-xs text-theme-tertiary truncate">{employee?.email}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-theme-tertiary">Expiry</div>
              <div className={`text-sm font-medium ${isExpired ? 'text-red-400' : isUrgent ? 'text-amber-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>
                {isNoExpiry ? 'Not set' : isExpired ? 'EXPIRED' : currentExpiry ? new Date(currentExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-14rem)]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================ */}
          {/* SECTION 1: Book Training Course (PRIMARY)   */}
          {/* ============================================ */}
          {resolvedCourse && employee && (
            <div className="rounded-xl border-2 border-[#D37E91]/40 bg-[#D37E91]/[0.06] p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-[#D37E91]/20">
                  <BookOpen className="w-4 h-4 text-[#D37E91]" />
                </div>
                <h3 className="text-theme-primary font-semibold">Book Training Course</h3>
              </div>

              <p className="text-sm text-theme-tertiary mb-4">
                Send {employee.full_name?.split(' ')[0] || 'the employee'} a course enrolment link.
                They&apos;ll receive a message on Msgly and a calendar reminder.
              </p>

              <div className="bg-theme-surface/50 rounded-lg p-3 mb-4 flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#D37E91] flex-shrink-0" />
                <div>
                  <div className="text-sm text-theme-primary font-medium">{resolvedCourse.name}</div>
                  <div className="text-xs text-theme-tertiary">£5.00 charge on completion</div>
                </div>
              </div>

              <button
                onClick={() => setShowBookModal(true)}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#D37E91] hover:bg-[#c06b7e] disabled:bg-[#D37E91]/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold text-sm"
              >
                <BookOpen className="w-4 h-4" />
                Book Course & Complete Task
              </button>
            </div>
          )}

          {/* OR Divider */}
          {resolvedCourse && employee && (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-theme-hover" />
              <span className="text-xs font-medium text-theme-tertiary uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-theme-hover" />
            </div>
          )}

          {/* ============================================ */}
          {/* SECTION 2: Update Expiry Date (SECONDARY)   */}
          {/* ============================================ */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-500/20">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-theme-primary font-semibold">
                {isNoExpiry ? 'Set Expiry Date' : 'Update Expiry Date'}
              </h3>
            </div>

            <p className="text-sm text-theme-tertiary mb-4">
              {isNoExpiry
                ? 'Already have the certificate? Enter the expiry date.'
                : 'Already renewed? Enter the new expiry date from the certificate.'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-theme-tertiary mb-1.5">New Expiry Date</label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white dark:bg-white/[0.06] border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                onClick={handleUpdateExpiry}
                disabled={!newExpiryDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
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
        <div className="flex items-center justify-end p-4 border-t border-theme">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Book Course Modal */}
      {showBookModal && resolvedCourse && employee && (
        <BookCourseFromTaskModal
          isOpen={true}
          onClose={() => setShowBookModal(false)}
          taskId={task.id}
          profileId={profileId}
          courseId={resolvedCourse.id}
          courseName={resolvedCourse.name}
          employeeName={employee.full_name || 'Employee'}
          companyId={employee.company_id}
          siteId={taskSiteId}
          managerId={currentUserProfile?.id || profileId}
          onSuccess={() => {
            setShowBookModal(false)
            onComplete()
            onClose()
          }}
        />
      )}
    </div>
  )
}
