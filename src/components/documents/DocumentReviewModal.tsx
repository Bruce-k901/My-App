'use client'

// ============================================================================
// DocumentReviewModal - Handle Document Expiry Tasks
// ============================================================================
// Allows managers to:
// 1. Upload new version of document (e.g., updated insurance certificate)
// 2. Update expiry date only (same document, renewed policy)
// 3. Archives old version before updating
// ============================================================================

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Upload, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react'
import type { ChecklistTaskWithTemplate } from '@/types/checklist-types'

interface DocumentReviewModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function DocumentReviewModal({
  task,
  isOpen,
  onClose,
  onComplete
}: DocumentReviewModalProps) {
  const supabase = createClientComponentClient()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<any>(null)
  const [mode, setMode] = useState<'upload' | 'update_expiry' | null>(null)

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newVersion, setNewVersion] = useState('')
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  // Load document data
  useEffect(() => {
    if (!isOpen) return

    const loadDocument = async () => {
      try {
        setLoading(true)
        setError(null)

        const taskData = task.task_data as Record<string, any>
        const documentId = taskData?.document_id

        if (!documentId) {
          throw new Error('Invalid task data: missing document_id')
        }

        const { data, error: docError } = await supabase
          .from('global_documents')
          .select('*')
          .eq('id', documentId)
          .single()

        if (docError) throw docError

        setDocument(data)

        // Pre-fill form with current data
        setNewVersion(data.version || 'v1.0')
        setNewExpiryDate(data.expiry_date || '')

      } catch (err) {
        console.error('Error loading document:', err)
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    loadDocument()
  }, [isOpen, task, supabase])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setMode('upload')
    }
  }

  const handleUploadNewVersion = async () => {
    if (!selectedFile || !document) return

    try {
      setSubmitting(true)
      setError(null)

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      // 1. Archive current version
      try {
        await supabase.from('compliance_archive').insert({
          source_type: 'document',
          source_id: document.id,
          source_table: 'global_documents',
          version_label: document.version,
          file_path: document.file_path,
          file_name: document.name,
          archived_by: user.id,
          review_task_id: task.id,
          company_id: task.company_id,
          display_name: document.name,
          document_category: document.category,
          changes_summary: `Uploaded new version ${newVersion}, expiry updated to ${newExpiryDate}`
        })
      } catch (archiveErr) {
        console.warn('Failed to create archive (table may not exist):', archiveErr)
      }

      // 2. Upload new file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${document.id}-${Date.now()}.${fileExt}`
      const filePath = `${task.company_id}/documents/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('global-docs')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 3. Update document record
      const { error: updateError } = await supabase
        .from('global_documents')
        .update({
          version: newVersion,
          expiry_date: newExpiryDate,
          file_path: filePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      if (updateError) throw updateError

      // 4. Complete task
      await completeTask()

    } catch (err) {
      console.error('Error uploading document:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload document')
      setSubmitting(false)
    }
  }

  const handleUpdateExpiryOnly = async () => {
    if (!document || !newExpiryDate) return

    try {
      setSubmitting(true)
      setError(null)

      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Not authenticated')

      // 1. Archive current state
      try {
        await supabase.from('compliance_archive').insert({
          source_type: 'document',
          source_id: document.id,
          source_table: 'global_documents',
          version_label: document.version,
          file_path: document.file_path,
          file_name: document.name,
          archived_by: user.id,
          review_task_id: task.id,
          company_id: task.company_id,
          display_name: document.name,
          document_category: document.category,
          changes_summary: `Expiry date updated from ${document.expiry_date} to ${newExpiryDate}`
        })
      } catch (archiveErr) {
        console.warn('Failed to create archive (table may not exist):', archiveErr)
      }

      // 2. Update expiry date
      const { error: updateError } = await supabase
        .from('global_documents')
        .update({
          expiry_date: newExpiryDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id)

      if (updateError) throw updateError

      // 3. Complete task
      await completeTask()

    } catch (err) {
      console.error('Error updating expiry:', err)
      setError(err instanceof Error ? err.message : 'Failed to update expiry date')
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

  const handleViewDocument = async () => {
    if (!document?.file_path) return

    try {
      const { data, error } = await supabase.storage
        .from('global-docs')
        .createSignedUrl(document.file_path, 60 * 60) // 1 hour

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error viewing document:', err)
      setError('Failed to open document')
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
            <div className="text-neutral-400 text-sm">Loading document details...</div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !document) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
          <h3 className="text-lg font-semibold text-white mb-4">Error Loading Document</h3>
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

  const daysUntilExpiry = document?.expiry_date
    ? Math.ceil((new Date(document.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/[0.08]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">Document Review Required</h2>
            <p className="text-sm text-neutral-400 mt-1">{document?.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50 ml-4"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-white/[0.03] rounded-lg p-4 mb-6 border border-white/[0.06]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Category</div>
                <div className="text-white font-medium">{document?.category}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Current Version</div>
                <div className="text-white font-medium">{document?.version || 'v1.0'}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Current Expiry</div>
                <div className="text-white font-medium">
                  {document?.expiry_date ? new Date(document.expiry_date).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Days Remaining</div>
                <div className={`font-medium ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 7
                    ? 'text-red-400'
                    : daysUntilExpiry !== null && daysUntilExpiry <= 14
                    ? 'text-amber-400'
                    : 'text-white'
                }`}>
                  {daysUntilExpiry !== null ? `${daysUntilExpiry} days` : 'N/A'}
                  {daysUntilExpiry !== null && daysUntilExpiry <= 7 && ' ⚠️'}
                </div>
              </div>
            </div>

            {document?.file_path && (
              <button
                onClick={handleViewDocument}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Current Document
              </button>
            )}
          </div>

          {/* Option 1: Upload New Version */}
          <div className="bg-white/[0.03] rounded-lg p-4 mb-4 border border-white/[0.06]">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Option 1: Upload New Version
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Select File</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx"
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <div className="mt-2 text-sm text-green-400">
                    Selected: {selectedFile.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">New Version</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="v2.0"
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">New Expiry Date</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleUploadNewVersion}
                disabled={!selectedFile || !newVersion || !newExpiryDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submitting && mode === 'upload' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Archive Old Version
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Update Expiry Only */}
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Option 2: Update Expiry Date Only
            </h3>
            <p className="text-sm text-neutral-400 mb-3">
              Use this if the document is the same but the policy has been renewed
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">New Expiry Date</label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleUpdateExpiryOnly}
                disabled={!newExpiryDate || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submitting && mode === 'update_expiry' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Update Expiry Date
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
