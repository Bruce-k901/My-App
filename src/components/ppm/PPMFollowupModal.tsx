'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, User, FileText, Upload, CheckCircle2, ExternalLink, AlertTriangle, Clock } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import { useAppContext } from '@/context/AppContext'
import LogServiceModal from '@/components/compliance/LogServiceModal'

interface PPMFollowupModalProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function PPMFollowupModal({ task, isOpen, onClose, onComplete }: PPMFollowupModalProps) {
  const [asset, setAsset] = useState<any>(null)
  const [callout, setCallout] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showLogServiceModal, setShowLogServiceModal] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])

  const { showToast } = useToast()
  const { profileId } = useAppContext()

  const taskData = task.task_data
  const assetId = taskData?.asset_id
  const calloutId = taskData?.callout_id

  useEffect(() => {
    if (isOpen && assetId && calloutId) {
      loadData()
    }
  }, [isOpen, assetId, calloutId])

  const loadData = async () => {
    try {
      // Load asset
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          category,
          serial_number,
          next_service_date,
          last_service_date,
          service_booking_date,
          ppm_status,
          site_id,
          sites (name),
          ppm_contractor_id,
          contractors:ppm_contractor_id (name, email, phone)
        `)
        .eq('id', assetId)
        .single()

      if (assetError) throw assetError
      setAsset(assetData)

      // Load callout
      const { data: calloutData, error: calloutError } = await supabase
        .from('callouts')
        .select(`
          id,
          callout_type,
          priority,
          status,
          fault_description,
          notes,
          scheduled_date,
          created_at,
          contractors (name, email, phone)
        `)
        .eq('id', calloutId)
        .single()

      if (calloutError) throw calloutError
      setCallout(calloutData)

      // Load documents for this callout
      const { data: docs } = await supabase
        .from('callout_documents')
        .select('*')
        .eq('callout_id', calloutId)
        .order('created_at', { ascending: false })

      setDocuments(docs || [])
    } catch (err: any) {
      console.error('Error loading PPM follow-up data:', err)
      showToast({
        title: 'Error',
        description: 'Failed to load follow-up task details',
        type: 'error'
      })
    }
  }

  const handleAddNotes = async () => {
    if (!notes.trim()) {
      showToast({
        title: 'Note Required',
        description: 'Please add a progress note',
        type: 'warning'
      })
      return
    }

    setLoading(true)
    try {
      // Add note to callout
      const { error: noteError } = await supabase
        .from('callouts')
        .update({
          notes: callout.notes
            ? `${callout.notes}\n\n[${new Date().toLocaleString()}] ${notes}`
            : `[${new Date().toLocaleString()}] ${notes}`
        })
        .eq('id', calloutId)

      if (noteError) throw noteError

      // Mark today's follow-up task as complete
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profileId,
          completion_notes: notes
        })
        .eq('id', task.id)

      if (taskError) throw taskError

      showToast({
        title: 'Task Updated',
        description: 'Progress note added. Task will reappear tomorrow.',
        type: 'success'
      })

      onComplete()
      onClose()
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message || 'Failed to update task',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${calloutId}-${Date.now()}.${fileExt}`
      const filePath = `callout-documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('callout-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('callout-files')
        .getPublicUrl(filePath)

      // Create document record
      const { error: docError } = await supabase
        .from('callout_documents')
        .insert({
          callout_id: calloutId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          uploaded_by: profileId
        })

      if (docError) throw docError

      showToast({
        title: 'Document Uploaded',
        description: 'Document added successfully',
        type: 'success'
      })

      loadData() // Reload documents
    } catch (err: any) {
      showToast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload document',
        type: 'error'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCompleteTask = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profileId
        })
        .eq('id', task.id)

      if (error) throw error

      showToast({
        title: 'Task Completed',
        description: 'Follow-up task marked as complete',
        type: 'success'
      })

      onComplete()
      onClose()
    } catch (err: any) {
      showToast({
        title: 'Error',
        description: err.message || 'Failed to complete task',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleServiceLogged = () => {
    loadData()
    setShowLogServiceModal(false)
    // Optionally auto-complete the task after service is logged
    showToast({
      title: 'Service Logged',
      description: 'You can now close this follow-up task',
      type: 'success'
    })
  }

  if (!isOpen) return null

  const isServiceBooked = asset?.ppm_status === 'service_booked'
  const serviceDate = asset?.service_booking_date || callout?.scheduled_date

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-neutral-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700 sticky top-0 bg-neutral-900 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">PPM Follow-up Task</h2>
                <p className="text-sm text-neutral-400">Update service status and add notes</p>
              </div>
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
            {/* Asset Info */}
            <div className="bg-neutral-800 rounded-lg p-5 border border-neutral-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {asset?.name || taskData?.asset_name}
                  </h3>
                  <p className="text-sm text-neutral-400">
                    {asset?.category} {asset?.serial_number && `• ${asset.serial_number}`}
                  </p>
                </div>
                {isServiceBooked && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-400">Service Booked</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-400">Site</p>
                    <p className="text-sm text-white">{asset?.sites?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-400">Contractor</p>
                    <p className="text-sm text-white">{asset?.contractors?.name || 'Not assigned'}</p>
                  </div>
                </div>
                {serviceDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <div>
                      <p className="text-xs text-neutral-400">Scheduled Date</p>
                      <p className="text-sm text-white">
                        {new Date(serviceDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-400">Last Service</p>
                    <p className="text-sm text-white">
                      {asset?.last_service_date
                        ? new Date(asset.last_service_date).toLocaleDateString('en-GB')
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Callout Details */}
            {callout && (
              <div className="bg-neutral-800 rounded-lg p-5 border border-neutral-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Original Callout</h4>
                  <a
                    href={`/dashboard/callouts?id=${calloutId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    View Callout <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {callout.fault_description && (
                  <p className="text-sm text-neutral-300 mb-2">{callout.fault_description}</p>
                )}
                {callout.notes && (
                  <div className="mt-3 pt-3 border-t border-neutral-700">
                    <p className="text-xs text-neutral-400 mb-1">Progress Notes:</p>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap">{callout.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-neutral-300 uppercase tracking-wide">What would you like to do?</h4>

              {/* Two Clear Options */}
              <div className="grid grid-cols-1 gap-4">
                {/* Option 1: Service NOT complete yet - Add progress note */}
                <div className="bg-neutral-800 rounded-lg p-5 border border-neutral-700">
                  <h5 className="text-base font-medium text-white mb-3">Service Not Complete Yet</h5>
                  <p className="text-sm text-neutral-400 mb-4">Add a progress note to track status</p>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g., Contractor confirmed for Friday, Parts ordered, Waiting for engineer..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none mb-3"
                  />

                  <button
                    onClick={handleAddNotes}
                    disabled={loading || !notes.trim()}
                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg transition-colors font-medium"
                  >
                    {loading ? 'Saving...' : 'Update Task & Close'}
                  </button>
                  <p className="text-xs text-neutral-500 mt-2 text-center">This task will reappear tomorrow until service is complete</p>
                </div>

                {/* Option 2: Service IS complete - Log it */}
                <div className="bg-neutral-800 rounded-lg p-5 border border-green-700/30 bg-green-500/5">
                  <h5 className="text-base font-medium text-white mb-3">Service Complete</h5>
                  <p className="text-sm text-neutral-400 mb-4">Log the completed service and upload documentation</p>

                  <button
                    onClick={() => setShowLogServiceModal(true)}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Log Service Complete
                  </button>
                </div>
              </div>

              {/* Show callout notes if they exist */}
              {callout?.notes && (
                <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                  <h5 className="text-sm font-medium text-white mb-2">Previous Updates</h5>
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap">{callout.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Service Modal */}
      {showLogServiceModal && asset && (
        <LogServiceModal
          assetId={assetId}
          assetName={asset.name}
          isOpen={showLogServiceModal}
          onClose={() => setShowLogServiceModal(false)}
          onComplete={handleServiceLogged}
        />
      )}
    </>
  )
}
