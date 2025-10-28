'use client'

import { X, Camera, Thermometer, FileText, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskCompletionPayload } from '@/types/checklist-types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TaskCompletionModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function TaskCompletionModal({
  task,
  isOpen,
  onClose,
  onComplete
}: TaskCompletionModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Initialize form data based on template fields
      const initialData: Record<string, any> = {}
      if (task.template?.repeatable_field_name) {
        initialData[task.template.repeatable_field_name] = []
      }
      setFormData(initialData)
      setPhotos([])
      setError('')
    }
  }, [isOpen, task])

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setPhotos(prev => [...prev, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!task.template) return

    setLoading(true)
    setError('')

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      // Upload photos if any
      const photoUrls: string[] = []
      for (const photo of photos) {
        const fileName = `${task.id}_${Date.now()}_${photo.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-evidence')
          .upload(fileName, photo)

        if (uploadError) throw uploadError
        photoUrls.push(uploadData.path)
      }

      // Create completion record
      const completionData: TaskCompletionPayload = {
        task_id: task.id,
        completed_by: user.user.id,
        completion_data: {
          ...formData,
          photos: photoUrls,
          completed_at: new Date().toISOString()
        },
        evidence_types: task.template.evidence_types || [],
        notes: formData.notes || ''
      }

      const { error: completionError } = await supabase
        .from('task_completion_records')
        .insert(completionData)

      if (completionError) throw completionError

      // Update task status
      const { error: updateError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.user.id
        })
        .eq('id', task.id)

      if (updateError) throw updateError

      onComplete()
    } catch (error) {
      console.error('Task completion error:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete task')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800/95 border border-neutral-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-800 border-b border-neutral-700 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{task.template?.name}</h2>
            <p className="text-sm text-neutral-400 mt-1">
              {task.template?.compliance_standard}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          {task.template?.instructions && (
            <div className="bg-neutral-700/30 rounded p-4">
              <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-2">
                Instructions
              </h3>
              <p className="text-neutral-400">{task.template.instructions}</p>
            </div>
          )}

          {/* Dynamic Fields */}
          <div className="space-y-4">
            {/* Temperature Field */}
            {task.template?.evidence_types?.includes('temperature') && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Temperature Reading
                </label>
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-neutral-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Enter temperature"
                    value={formData.temperature || ''}
                    onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value))}
                    className="flex-1 px-3 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-400"
                  />
                  <span className="text-sm text-neutral-400">°C</span>
                </div>
              </div>
            )}

            {/* Pass/Fail Field */}
            {task.template?.evidence_types?.includes('pass_fail') && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFieldChange('status', 'pass')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      formData.status === 'pass'
                        ? 'bg-green-600 text-white'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-green-600/20'
                    }`}
                  >
                    <CheckCircle2 className="inline mr-2 h-4 w-4" />
                    Pass
                  </button>
                  <button
                    onClick={() => handleFieldChange('status', 'fail')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      formData.status === 'fail'
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-red-600/20'
                    }`}
                  >
                    <AlertCircle className="inline mr-2 h-4 w-4" />
                    Fail
                  </button>
                </div>
              </div>
            )}

            {/* Text Note Field */}
            {task.template?.evidence_types?.includes('text_note') && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Notes
                </label>
                <textarea
                  placeholder="Add any notes or observations..."
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-400"
                />
              </div>
            )}

            {/* Photo Upload */}
            {task.template?.evidence_types?.includes('photo') && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Photos
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-700 transition-all"
                  >
                    <Camera className="h-4 w-4 text-neutral-400" />
                    <span className="text-neutral-300">Add Photos</span>
                  </label>
                  
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-24 object-cover rounded border border-neutral-600"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-600/20 border border-red-600/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-800 border-t border-neutral-700 p-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600/70 to-blue-600/70 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Completing...' : 'Complete Task'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
