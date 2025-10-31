'use client'

import { useState, useEffect } from 'react'
import { Wrench, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import { useAppContext } from '@/context/AppContext'
import { Button } from '@/components/ui/Button'

interface CalloutFollowUpTaskCardProps {
  task: ChecklistTaskWithTemplate
  onUpdate?: () => void
}

interface CalloutDetails {
  id: string
  callout_type: 'reactive' | 'warranty' | 'ppm'
  priority: 'low' | 'medium' | 'urgent'
  status: 'open' | 'closed' | 'reopened'
  fault_description: string | null
  contractor_name: string | null
  created_at: string
  created_by_name: string | null
}

export default function CalloutFollowUpTaskCard({ task, onUpdate }: CalloutFollowUpTaskCardProps) {
  const [calloutDetails, setCalloutDetails] = useState<CalloutDetails | null>(null)
  const [updateNotes, setUpdateNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCallout, setLoadingCallout] = useState(true)
  const { companyId, siteId } = useAppContext()
  const { showToast } = useToast()

  useEffect(() => {
    if (task.callout_id) {
      loadCalloutDetails()
    } else {
      setLoadingCallout(false)
    }
  }, [task.callout_id])

  const loadCalloutDetails = async () => {
    if (!task.callout_id) return

    try {
      setLoadingCallout(true)
      
      // Get callout directly from callouts table with joins
      const { data: callout, error } = await supabase
        .from('callouts')
        .select(`
          id,
          callout_type,
          priority,
          status,
          fault_description,
          created_at,
          contractor_id,
          created_by
        `)
        .eq('id', task.callout_id)
        .single()

      if (error) throw error

      if (callout) {
        // Load contractor name separately
        let contractorName = null
        if (callout.contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', callout.contractor_id)
            .single()
          contractorName = contractor?.name || null
        }

        // Load creator name separately
        let createdByName = null
        if (callout.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', callout.created_by)
            .single()
          createdByName = profile?.full_name || null
        }
        
        setCalloutDetails({
          id: callout.id,
          callout_type: callout.callout_type,
          priority: callout.priority,
          status: callout.status,
          fault_description: callout.fault_description,
          contractor_name: contractorName,
          created_at: callout.created_at,
          created_by_name: createdByName,
        })
      }
    } catch (error) {
      console.error('Error loading callout details:', error)
      showToast({
        title: 'Error',
        description: 'Failed to load callout details',
        type: 'error'
      })
    } finally {
      setLoadingCallout(false)
    }
  }

  const createAlert = async (title: string, message: string, severity: 'warning' | 'critical') => {
    if (!companyId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('notifications').insert({
        company_id: companyId,
        site_id: siteId || null,
        type: 'task',
        title,
        message,
        severity,
        recipient_role: 'manager',
        status: 'active'
      })

      if (error) throw error
    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  const handleResolved = async () => {
    if (!task.callout_id || !calloutDetails) return

    setLoading(true)
    try {
      // Update callout status to closed
      const { error: updateError } = await supabase
        .from('callouts')
        .update({
          status: 'closed',
          repair_summary: updateNotes || 'Resolved - No further action required',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.callout_id)

      if (updateError) throw updateError

      // Update task status
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: updateNotes || 'Callout resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      // Create alert
      await createAlert(
        'Callout Resolved',
        `Callout for ${calloutDetails.contractor_name || 'contractor'} has been marked as resolved.`,
        'warning'
      )

      showToast({
        title: 'Callout Resolved',
        description: 'The callout has been marked as resolved',
        type: 'success'
      })

      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error resolving callout:', error)
      showToast({
        title: 'Error',
        description: 'Failed to update callout',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelled = async () => {
    if (!task.callout_id || !calloutDetails) return

    setLoading(true)
    try {
      // Update callout - add cancellation note
      const { error: updateError } = await supabase
        .from('callouts')
        .update({
          notes: (calloutDetails.fault_description || '') + '\n\n[CANCELLED] ' + (updateNotes || 'Callout cancelled'),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.callout_id)

      if (updateError) throw updateError

      // Update task status
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: updateNotes || 'Callout cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      // Create alert
      await createAlert(
        'Callout Cancelled',
        `Callout for ${calloutDetails.contractor_name || 'contractor'} has been cancelled.`,
        'warning'
      )

      showToast({
        title: 'Callout Cancelled',
        description: 'The callout has been cancelled',
        type: 'success'
      })

      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error cancelling callout:', error)
      showToast({
        title: 'Error',
        description: 'Failed to update callout',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNotResolved = async () => {
    if (!task.callout_id || !calloutDetails || !companyId || !siteId) return

    setLoading(true)
    try {
      // Update callout with notes
      if (updateNotes) {
        const { error: updateError } = await supabase
          .from('callouts')
          .update({
            notes: (calloutDetails.fault_description || '') + '\n\n[UPDATE] ' + updateNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.callout_id)

        if (updateError) throw updateError
      }

      // Update current task status
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: updateNotes || 'Not resolved - follow-up scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      // Create new task for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDate = tomorrow.toISOString().split('T')[0]

      const { error: newTaskError } = await supabase
        .from('checklist_tasks')
        .insert({
          company_id: companyId,
          site_id: siteId,
          template_id: null, // No template for callout follow-up tasks
          due_date: tomorrowDate,
          due_time: '09:00',
          daypart: 'during_service',
          assigned_to_role: 'manager',
          status: 'pending',
          priority: task.priority === 'critical' ? 'critical' : 'high',
          flagged: true,
          flag_reason: 'callout_followup',
          callout_id: task.callout_id,
          generated_at: new Date().toISOString(),
        })

      if (newTaskError) throw newTaskError

      // Create alert
      await createAlert(
        'Callout Not Resolved',
        `Callout for ${calloutDetails.contractor_name || 'contractor'} is not yet resolved. Follow-up task scheduled for tomorrow.`,
        'warning'
      )

      showToast({
        title: 'Follow-up Scheduled',
        description: 'A new follow-up task has been created for tomorrow',
        type: 'success'
      })

      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error handling not resolved:', error)
      showToast({
        title: 'Error',
        description: 'Failed to update callout and create follow-up',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingCallout) {
    return (
      <div className="border border-neutral-700 rounded-lg p-4">
        <div className="text-neutral-400 text-sm">Loading callout details...</div>
      </div>
    )
  }

  if (!calloutDetails) {
    return (
      <div className="border border-orange-500/50 bg-orange-500/10 rounded-lg p-4">
        <div className="text-orange-400 text-sm">Callout details not found</div>
      </div>
    )
  }

  const getCalloutTypeColor = () => {
    switch (calloutDetails.callout_type) {
      case 'reactive': return 'bg-red-500/20 text-red-400'
      case 'warranty': return 'bg-blue-500/20 text-blue-400'
      case 'ppm': return 'bg-green-500/20 text-green-400'
      default: return 'bg-neutral-500/20 text-neutral-400'
    }
  }

  const getPriorityColor = () => {
    switch (calloutDetails.priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-neutral-500/20 text-neutral-400'
    }
  }

  return (
    <div className="border border-orange-500/50 bg-orange-500/10 rounded-lg p-4">
      {/* Callout Details Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Callout Follow-Up</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getCalloutTypeColor()}`}>
              {calloutDetails.callout_type.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor()}`}>
              {calloutDetails.priority.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Callout Information */}
        <div className="bg-neutral-800/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Contractor:</span>
            <span className="text-white">{calloutDetails.contractor_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Created by:</span>
            <span className="text-white">{calloutDetails.created_by_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Created:</span>
            <span className="text-white">{new Date(calloutDetails.created_at).toLocaleDateString()}</span>
          </div>
          {calloutDetails.fault_description && (
            <div className="pt-2 border-t border-neutral-700">
              <span className="text-neutral-400 block mb-1">Fault Description:</span>
              <span className="text-white text-sm">{calloutDetails.fault_description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Update Notes Field */}
      <div className="mb-4">
        <label className="block text-sm text-neutral-400 mb-2">Update Notes</label>
        <textarea
          value={updateNotes}
          onChange={(e) => setUpdateNotes(e.target.value)}
          placeholder="Add any updates or notes about this callout..."
          className="w-full h-24 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleResolved}
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
        >
          <CheckCircle2 size={16} className="mr-2" />
          Resolved/Fixed
        </Button>
        <Button
          onClick={handleCancelled}
          disabled={loading}
          className="flex-1 bg-neutral-600 hover:bg-neutral-700 text-white"
        >
          <XCircle size={16} className="mr-2" />
          Callout Cancelled
        </Button>
        <Button
          onClick={handleNotResolved}
          disabled={loading}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <AlertCircle size={16} className="mr-2" />
          Not Resolved
        </Button>
      </div>
    </div>
  )
}

