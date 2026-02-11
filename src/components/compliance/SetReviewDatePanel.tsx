'use client'

import { useState } from 'react'
import { X, Calendar, AlertCircle } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'

interface SetReviewDatePanelProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function SetReviewDatePanel({
  task,
  isOpen,
  onClose,
  onComplete
}: SetReviewDatePanelProps) {
  const [reviewDate, setReviewDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const taskData = task.task_data as any
  const taskType = taskData?.task_type

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!reviewDate) {
      setError('Please enter a review date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update the record based on task type
      if (taskType === 'sop_no_review_date') {
        // Get current sop_data and update it
        const { data: sop, error: fetchError } = await supabase
          .from('sop_entries')
          .select('sop_data')
          .eq('id', taskData.target_record_id)
          .single()

        if (fetchError) throw fetchError

        const sopData = (sop.sop_data as any) || {}
        sopData.next_review_date = reviewDate

        const { error: updateError } = await supabase
          .from('sop_entries')
          .update({
            sop_data: sopData,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskData.target_record_id)

        if (updateError) throw updateError
      } else if (taskType === 'ra_no_review_date') {
        const { error: updateError } = await supabase
          .from('risk_assessments')
          .update({
            next_review_date: reviewDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskData.target_record_id)

        if (updateError) throw updateError
      }

      // Complete the task
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          completion_notes: `Review date set: ${reviewDate}`
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      showToast('Review date set successfully', 'success')
      onComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to set review date')
      console.error('Error setting review date:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate suggested review date (1 year from now)
  const getSuggestedReview = () => {
    const suggested = new Date()
    suggested.setFullYear(suggested.getFullYear() + 1)
    return suggested.toISOString().split('T')[0]
  }

  const suggestedReview = getSuggestedReview()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-white">Set Review Date</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Compliance Gap Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-500 mb-1">COMPLIANCE GAP</h3>
                <p className="text-sm text-neutral-300">
                  {taskType === 'sop_no_review_date' && (
                    <>
                      SOP {taskData.sop_ref_code} - {taskData.sop_title}
                      <br />
                      This SOP has no review date set.
                    </>
                  )}
                  {taskType === 'ra_no_review_date' && (
                    <>
                      RA {taskData.ra_ref_code} - {taskData.ra_title}
                      <br />
                      This Risk Assessment has no review date set.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Review Date Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Enter Review Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Suggested Review */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-300">
                <p className="font-medium text-blue-400 mb-1">Suggested Review Date</p>
                <p>
                  Standard review period is 1 year. Suggested date:{' '}
                  <button
                    onClick={() => setReviewDate(suggestedReview)}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {new Date(suggestedReview).toLocaleDateString()}
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-700">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !reviewDate}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Setting...' : 'Set Review Date & Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
