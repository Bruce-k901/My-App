'use client'

// ============================================================================
// SOPReviewModal - Handle SOP Review Tasks
// ============================================================================
// Task-aware modal for reviewing Standard Operating Procedures
// Allows managers to:
// 1. View SOP details and content
// 2. Confirm they have reviewed the SOP
// 3. Update the next review date
// 4. Optionally add notes
// ============================================================================

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, FileText, Calendar, AlertCircle, Loader2, CheckCircle, Clock, ExternalLink } from '@/components/ui/icons'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface SOPReviewModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function SOPReviewModal({
  task,
  isOpen,
  onClose,
  onComplete
}: SOPReviewModalProps) {
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sop, setSop] = useState<any>(null)

  // Form state
  const [confirmed, setConfirmed] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState('')

  // Extract task data
  const taskData = task.task_data as Record<string, any> | null
  const sopId = taskData?.sop_id
  const reviewDate = taskData?.review_date
  const daysUntilReview = taskData?.days_until_review

  // Load SOP data
  useEffect(() => {
    if (!isOpen || !sopId) return

    const loadSOP = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: sopError } = await supabase
          .from('site_sops')
          .select('*')
          .eq('id', sopId)
          .single()

        if (sopError) throw sopError

        setSop(data)

        // Set default next review date (1 year from now)
        const defaultNextReview = new Date()
        defaultNextReview.setFullYear(defaultNextReview.getFullYear() + 1)
        setNextReviewDate(defaultNextReview.toISOString().split('T')[0])

      } catch (err) {
        console.error('Error loading SOP:', err)
        setError(err instanceof Error ? err.message : 'Failed to load SOP')
      } finally {
        setLoading(false)
      }
    }

    loadSOP()
  }, [isOpen, sopId, supabase])

  const handleSubmitReview = async () => {
    if (!confirmed || !sop) return

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

      // 1. Update SOP with new review date
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Update sop_data with review information
      const sopData = sop.sop_data || {}
      sopData.review_date = nextReviewDate
      sopData.last_reviewed_at = new Date().toISOString()
      sopData.last_reviewed_by = profile?.full_name || user.email
      if (reviewNotes) {
        sopData.review_notes = reviewNotes
      }
      updateData.sop_data = sopData

      const { error: updateError } = await supabase
        .from('site_sops')
        .update(updateData)
        .eq('id', sopId)

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

  const handleViewSOP = async () => {
    if (!sop?.file_path) return

    try {
      const { data, error } = await supabase.storage
        .from('sops')
        .createSignedUrl(sop.file_path, 60 * 60) // 1 hour

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error viewing SOP:', err)
      setError('Failed to open SOP document')
    }
  }

  if (!isOpen) return null

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl p-8 border border-white/[0.08]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-neutral-400 text-sm">Loading SOP details...</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (no SOP found)
  if (error && !sop) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white mb-4">Error Loading SOP</h3>
          <p className="text-neutral-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const isOverdue = daysUntilReview !== undefined && daysUntilReview < 0
  const isUrgent = daysUntilReview !== undefined && daysUntilReview <= 7

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/[0.08]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-500/20' : isUrgent ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
              <FileText className={`w-5 h-5 ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-blue-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">SOP Review Required</h2>
              <p className="text-sm text-neutral-400">{sop?.ref_code || 'No reference'}</p>
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

          {/* SOP Info */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <h3 className="text-white font-semibold text-lg mb-2">{sop?.title || 'Untitled SOP'}</h3>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Reference Code</div>
                <div className="text-white font-medium">{sop?.ref_code || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Category</div>
                <div className="text-white font-medium">{sop?.category || 'General'}</div>
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

            {sop?.file_path && (
              <button
                onClick={handleViewSOP}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View SOP Document
              </button>
            )}
          </div>

          {/* Description/Content Preview */}
          {sop?.description && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
              <h4 className="text-sm font-medium text-neutral-400 mb-2">Description</h4>
              <p className="text-white text-sm whitespace-pre-wrap">{sop.description}</p>
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
                  className="mt-1 w-5 h-5 rounded border-neutral-600 bg-neutral-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-white text-sm group-hover:text-neutral-200">
                  I confirm that I have reviewed this Standard Operating Procedure and it is current, accurate, and fit for purpose.
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
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="Add any notes about this review..."
                  rows={3}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={!confirmed || !nextReviewDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
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
