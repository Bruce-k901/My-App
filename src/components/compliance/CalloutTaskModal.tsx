'use client'

// ============================================================================
// CalloutTaskModal - Handle Callout Follow-up Tasks
// ============================================================================
// Task-aware modal for following up on open callouts
// Allows managers to:
// 1. View callout details (asset, fault, contractor)
// 2. Update callout status (visited, awaiting parts, completed, etc.)
// 3. Add notes or repair summary
// 4. Upload worksheets/documents
// 5. Close the callout when work is complete
// ============================================================================

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  X,
  Wrench,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  Phone,
  FileText,
  Upload,
  User,
  Calendar,
  Package,
  AlertTriangle
} from '@/components/ui/icons'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface CalloutTaskModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type CalloutStatus = 'not_yet_visited' | 'in_progress' | 'awaiting_parts' | 'completed' | 'cancelled'

const STATUS_OPTIONS: { value: CalloutStatus; label: string; description: string; color: string }[] = [
  { value: 'not_yet_visited', label: 'Not Yet Visited', description: 'Contractor has not yet attended site', color: 'text-amber-400 bg-amber-500/20' },
  { value: 'in_progress', label: 'In Progress', description: 'Work is ongoing', color: 'text-blue-400 bg-blue-500/20' },
  { value: 'awaiting_parts', label: 'Awaiting Parts', description: 'Waiting for parts/materials to arrive', color: 'text-purple-400 bg-purple-500/20' },
  { value: 'completed', label: 'Completed', description: 'Work has been completed successfully', color: 'text-green-400 bg-green-500/20' },
  { value: 'cancelled', label: 'Cancelled', description: 'Callout has been cancelled', color: 'text-red-400 bg-red-500/20' },
]

export default function CalloutTaskModal({
  task,
  isOpen,
  onClose,
  onComplete
}: CalloutTaskModalProps) {
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callout, setCallout] = useState<any>(null)
  const [asset, setAsset] = useState<any>(null)
  const [contractor, setContractor] = useState<any>(null)

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<CalloutStatus>('not_yet_visited')
  const [updateNotes, setUpdateNotes] = useState('')
  const [repairSummary, setRepairSummary] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Extract task data
  const taskData = task.task_data as Record<string, any> | null
  const calloutId = taskData?.source_id || taskData?.callout_id

  // Load callout data
  useEffect(() => {
    if (!isOpen || !calloutId) return

    const loadCallout = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load callout
        const { data: calloutData, error: calloutError } = await supabase
          .from('callouts')
          .select('*')
          .eq('id', calloutId)
          .maybeSingle()

        if (calloutError) throw calloutError
        if (!calloutData) throw new Error('Callout not found — it may have been deleted')

        setCallout(calloutData)

        // Load asset if exists
        if (calloutData.asset_id) {
          const { data: assetData } = await supabase
            .from('assets')
            .select('id, name, serial_number, location, category')
            .eq('id', calloutData.asset_id)
            .maybeSingle()

          setAsset(assetData)
        }

        // Load contractor if exists
        if (calloutData.contractor_id) {
          const { data: contractorData } = await supabase
            .from('contractors')
            .select('id, name, contact_name, phone, email')
            .eq('id', calloutData.contractor_id)
            .maybeSingle()

          setContractor(contractorData)
        }

        // Set initial status based on callout
        if (calloutData.status === 'closed') {
          setSelectedStatus('completed')
        }

      } catch (err) {
        console.warn('Callout not found for task:', calloutId, err)
        setError(err instanceof Error ? err.message : 'Failed to load callout')
      } finally {
        setLoading(false)
      }
    }

    loadCallout()
  }, [isOpen, calloutId, supabase])

  // Dismiss orphaned task (callout was deleted)
  const handleDismissOrphanedTask = async () => {
    try {
      setSubmitting(true)
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          completion_data: {
            callout_status: 'dismissed',
            reason: 'Callout no longer exists',
          }
        })
        .eq('id', task.id)

      if (taskError) throw taskError
      onComplete()
      onClose()
    } catch (err) {
      console.error('Error dismissing task:', err)
      setError(err instanceof Error ? err.message : 'Failed to dismiss task')
      setSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!callout) return

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

      // Upload document if selected
      let documentUrl: string | null = null
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${calloutId}-${Date.now()}.${fileExt}`
        const filePath = `${task.company_id}/callouts/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('callout-docs')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.warn('Failed to upload document:', uploadError)
        } else {
          documentUrl = filePath
        }
      }

      // Prepare callout update
      const calloutUpdate: any = {
        updated_at: new Date().toISOString()
      }

      // Add timeline entry
      const timelineEntry = {
        timestamp: new Date().toISOString(),
        action: `Status updated to: ${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}`,
        by: profile?.full_name || user.email,
        notes: updateNotes || null
      }

      const existingTimeline = callout.log_timeline || []
      calloutUpdate.log_timeline = [...existingTimeline, timelineEntry]

      // Handle status-specific updates
      if (selectedStatus === 'completed') {
        calloutUpdate.status = 'closed'
        calloutUpdate.closed_at = new Date().toISOString()
        if (repairSummary) {
          calloutUpdate.repair_summary = repairSummary
        }
      } else if (selectedStatus === 'cancelled') {
        calloutUpdate.status = 'closed'
        calloutUpdate.closed_at = new Date().toISOString()
        calloutUpdate.repair_summary = 'Callout cancelled: ' + (updateNotes || 'No reason provided')
      }

      // Add document if uploaded
      if (documentUrl) {
        const existingDocs = callout.documents || []
        calloutUpdate.documents = [...existingDocs, documentUrl]
      }

      // Update callout
      const { error: updateError } = await supabase
        .from('callouts')
        .update(calloutUpdate)
        .eq('id', calloutId)

      if (updateError) throw updateError

      // Complete the task if callout is completed/cancelled
      if (selectedStatus === 'completed' || selectedStatus === 'cancelled') {
        const { error: taskError } = await supabase
          .from('checklist_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: user.id,
            completion_data: {
              callout_status: selectedStatus,
              updated_by: profile?.full_name || user.email,
              notes: updateNotes || null,
              repair_summary: repairSummary || null
            }
          })
          .eq('id', task.id)

        if (taskError) throw taskError

        onComplete()
      }

      onClose()

    } catch (err) {
      console.error('Error updating callout:', err)
      setError(err instanceof Error ? err.message : 'Failed to update callout')
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-theme-surface-elevated rounded-xl shadow-2xl p-8 border border-theme">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-theme-tertiary text-sm">Loading callout details...</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (no callout found — allow dismissing orphaned task)
  if (error && !callout) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-theme-surface-elevated rounded-xl shadow-2xl max-w-md w-full p-6 border border-theme">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">Callout Not Found</h3>
          </div>
          <p className="text-theme-tertiary mb-2">
            The callout linked to this task no longer exists. It may have been closed or the related asset was removed.
          </p>
          <p className="text-theme-tertiary text-sm mb-6">
            You can dismiss this task to remove it from your list.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleDismissOrphanedTask}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white rounded-lg transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dismissing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Dismiss Task
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-full px-4 py-2 text-sm text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getCalloutTypeColor = (type: string) => {
    switch (type) {
      case 'ppm': return 'text-blue-400 bg-blue-500/20'
      case 'reactive': return 'text-rose-400 bg-rose-500/20'
      case 'warranty': return 'text-green-400 bg-green-500/20'
      default: return 'text-theme-tertiary bg-neutral-500/20'
    }
  }

  const daysSinceCreated = callout?.created_at
    ? Math.floor((new Date().getTime() - new Date(callout.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface-elevated rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-theme">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20">
              <Wrench className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">Callout Follow-up</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getCalloutTypeColor(callout?.callout_type)}`}>
                  {callout?.callout_type?.toUpperCase()}
                </span>
                <span className="text-sm text-theme-tertiary">
                  {daysSinceCreated} days ago
                </span>
              </div>
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Callout Info */}
          <div className="bg-theme-surface rounded-lg p-4 border border-theme">
            <div className="grid grid-cols-2 gap-4">
              {/* Asset */}
              {asset && (
                <div className="col-span-2">
                  <div className="text-xs text-theme-tertiary mb-1">Asset</div>
                  <div className="text-theme-primary font-medium">{asset.name}</div>
                  {asset.serial_number && (
                    <div className="text-sm text-theme-tertiary">S/N: {asset.serial_number}</div>
                  )}
                </div>
              )}

              {/* Fault Description */}
              {callout?.fault_description && (
                <div className="col-span-2">
                  <div className="text-xs text-theme-tertiary mb-1">Fault Description</div>
                  <div className="text-theme-primary text-sm">{callout.fault_description}</div>
                </div>
              )}

              {/* Contractor */}
              {contractor && (
                <div className="col-span-2 pt-3 border-t border-theme">
                  <div className="text-xs text-theme-tertiary mb-2">Contractor</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-[#D37E91]/80 flex items-center justify-center text-white font-semibold">
                      {contractor.name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <div className="text-theme-primary font-medium">{contractor.name}</div>
                      {contractor.contact_name && (
                        <div className="text-sm text-theme-tertiary">{contractor.contact_name}</div>
                      )}
                    </div>
                    {contractor.phone && (
                      <a
                        href={`tel:${contractor.phone}`}
                        className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-theme-muted hover:bg-theme-hover rounded-lg text-sm text-theme-primary transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Created */}
              <div>
                <div className="text-xs text-theme-tertiary mb-1">Created</div>
                <div className="text-theme-primary text-sm">
                  {callout?.created_at ? new Date(callout.created_at).toLocaleDateString() : 'Unknown'}
                </div>
              </div>

              {/* Current Status */}
              <div>
                <div className="text-xs text-theme-tertiary mb-1">Current Status</div>
                <div className={`text-sm font-medium ${callout?.status === 'open' ? 'text-amber-400' : 'text-green-400'}`}>
                  {callout?.status === 'open' ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-theme-surface rounded-lg p-4 border border-theme">
            <h3 className="text-theme-primary font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Update Status
            </h3>

            <div className="space-y-3">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedStatus === option.value
                      ? 'bg-theme-hover border border-rose-500/50'
                      : 'bg-theme-surface border border-theme hover:bg-theme-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value as CalloutStatus)}
                    disabled={submitting}
                    className="mt-1 w-4 h-4 text-rose-500 focus:ring-rose-500 focus:ring-offset-0 bg-theme-muted border-theme"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-sm text-theme-tertiary mt-1">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Repair Summary (for completed status) */}
          {selectedStatus === 'completed' && (
            <div className="bg-theme-surface rounded-lg p-4 border border-theme">
              <h3 className="text-theme-primary font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Repair Summary
              </h3>
              <textarea
                value={repairSummary}
                onChange={(e) => setRepairSummary(e.target.value)}
                placeholder="Describe the work completed..."
                rows={3}
                disabled={submitting}
                className="w-full px-3 py-2 bg-theme-muted border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          )}

          {/* Notes & Document Upload */}
          <div className="bg-theme-surface rounded-lg p-4 border border-theme">
            <h3 className="text-theme-primary font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-theme-tertiary" />
              Notes & Documents
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-theme-tertiary mb-2">Update Notes (Optional)</label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Add any notes about this update..."
                  rows={2}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-theme-muted border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-theme-tertiary mb-2">Upload Worksheet/Document (Optional)</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-theme-muted border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {selectedFile && (
                  <div className="mt-2 text-sm text-green-400">
                    Selected: {selectedFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : selectedStatus === 'completed' || selectedStatus === 'cancelled' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Update & Complete Task
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Save Update
              </>
            )}
          </button>

          {selectedStatus !== 'completed' && selectedStatus !== 'cancelled' && (
            <p className="text-xs text-theme-tertiary text-center">
              Task will remain open until callout is marked as Completed or Cancelled
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
