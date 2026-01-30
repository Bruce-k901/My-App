'use client'

// ============================================================================
// RAReviewModal - Handle Risk Assessment Review Tasks
// ============================================================================
// Task-aware modal for reviewing Risk Assessments
// Allows managers to:
// 1. View RA details, hazards, and controls
// 2. Confirm they have reviewed the RA
// 3. Update the next review date
// 4. Optionally add notes or flag for updates
// ============================================================================

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Shield, Calendar, AlertCircle, Loader2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface RAReviewModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function RAReviewModal({
  task,
  isOpen,
  onClose,
  onComplete
}: RAReviewModalProps) {
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [riskAssessment, setRiskAssessment] = useState<any>(null)

  // Form state
  const [confirmed, setConfirmed] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState('')
  const [needsUpdate, setNeedsUpdate] = useState(false)

  // Extract task data
  const taskData = task.task_data as Record<string, any> | null
  const raId = taskData?.ra_id
  const reviewDate = taskData?.review_date
  const daysUntilReview = taskData?.days_until_review

  // Load RA data
  useEffect(() => {
    if (!isOpen || !raId) return

    const loadRA = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: raError } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('id', raId)
          .single()

        if (raError) throw raError

        setRiskAssessment(data)

        // Set default next review date (1 year from now)
        const defaultNextReview = new Date()
        defaultNextReview.setFullYear(defaultNextReview.getFullYear() + 1)
        setNextReviewDate(defaultNextReview.toISOString().split('T')[0])

      } catch (err) {
        console.error('Error loading RA:', err)
        setError(err instanceof Error ? err.message : 'Failed to load Risk Assessment')
      } finally {
        setLoading(false)
      }
    }

    loadRA()
  }, [isOpen, raId, supabase])

  const handleSubmitReview = async () => {
    if (!confirmed || !riskAssessment) return

    try {
      setSubmitting(true)
      setError(null)

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single()

      // 1. Update RA with new review date
      const { error: updateError } = await supabase
        .from('risk_assessments')
        .update({
          next_review_date: nextReviewDate,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: profile?.id || user.id,
          status: needsUpdate ? 'Needs Update' : 'Active',
          updated_at: new Date().toISOString()
        })
        .eq('id', raId)

      if (updateError) throw updateError

      // 2. Complete the task
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          completion_data: {
            reviewed_by: profile?.full_name || user.email,
            reviewed_at: new Date().toISOString(),
            next_review_date: nextReviewDate,
            needs_update: needsUpdate,
            notes: reviewNotes || null
          }
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      onComplete()
      onClose()

    } catch (err) {
      console.error('Error submitting review:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit review')
      setSubmitting(false)
    }
  }

  const handleViewRA = async () => {
    if (!riskAssessment?.file_path) return

    try {
      const { data, error } = await supabase.storage
        .from('risk-assessments')
        .createSignedUrl(riskAssessment.file_path, 60 * 60) // 1 hour

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error viewing RA:', err)
      setError('Failed to open Risk Assessment document')
    }
  }

  if (!isOpen) return null

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl p-8 border border-white/[0.08]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-neutral-400 text-sm">Loading Risk Assessment...</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (no RA found)
  if (error && !riskAssessment) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white mb-4">Error Loading Risk Assessment</h3>
          <p className="text-neutral-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const isOverdue = daysUntilReview !== undefined && daysUntilReview < 0
  const isUrgent = daysUntilReview !== undefined && daysUntilReview <= 7

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-amber-400 bg-amber-500/20'
      case 'low': return 'text-green-400 bg-green-500/20'
      default: return 'text-neutral-400 bg-neutral-500/20'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/[0.08]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-500/20' : isUrgent ? 'bg-amber-500/20' : 'bg-orange-500/20'}`}>
              <Shield className={`w-5 h-5 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-orange-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Risk Assessment Review</h2>
              <p className="text-sm text-neutral-400">{riskAssessment?.ref_code || 'No reference'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-neutral-400" />
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

          {/* RA Info */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <h3 className="text-white font-semibold text-lg mb-2">{riskAssessment?.title || 'Untitled Risk Assessment'}</h3>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Reference Code</div>
                <div className="text-white font-medium">{riskAssessment?.ref_code || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Risk Level</div>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(riskAssessment?.risk_level)}`}>
                  {riskAssessment?.risk_level || 'Not assessed'}
                </span>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Review Due</div>
                <div className={`font-medium ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white'}`}>
                  {reviewDate ? new Date(reviewDate).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Status</div>
                <div className={`font-medium ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-green-400'}`}>
                  {isOverdue ? 'OVERDUE' : daysUntilReview !== undefined ? `${daysUntilReview} days remaining` : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Hazard Type */}
            {riskAssessment?.hazard_type && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-xs text-neutral-500 mb-1">Hazard Type</div>
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  {riskAssessment.hazard_type}
                </div>
              </div>
            )}

            {riskAssessment?.file_path && (
              <button
                onClick={handleViewRA}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Risk Assessment Document
              </button>
            )}
          </div>

          {/* Description */}
          {riskAssessment?.description && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
              <h4 className="text-sm font-medium text-neutral-400 mb-2">Description</h4>
              <p className="text-white text-sm whitespace-pre-wrap">{riskAssessment.description}</p>
            </div>
          )}

          {/* Controls */}
          {riskAssessment?.controls && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
              <h4 className="text-sm font-medium text-neutral-400 mb-2">Control Measures</h4>
              <p className="text-white text-sm whitespace-pre-wrap">{riskAssessment.controls}</p>
            </div>
          )}

          {/* Review Form */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Confirm Review
            </h3>

            <div className="space-y-4">
              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                />
                <span className="text-white text-sm group-hover:text-neutral-200">
                  I confirm that I have reviewed this Risk Assessment and the identified hazards, controls, and risk levels are current and appropriate.
                </span>
              </label>

              {/* Needs Update Flag */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={needsUpdate}
                  onChange={(e) => setNeedsUpdate(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <span className="text-white text-sm group-hover:text-neutral-200">
                  <span className="text-amber-400">Flag for update:</span> This Risk Assessment requires changes or updates (will be marked as "Needs Update")
                </span>
              </label>

              {/* Next Review Date */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Next Review Date</label>
                <input
                  type="date"
                  value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Set the date for the next scheduled review (typically 1 year)
                </p>
              </div>

              {/* Review Notes */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Review Notes (Optional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this review, changes needed, etc..."
                  rows={3}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={!confirmed || !nextReviewDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Review...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Review & Complete Task
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
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
