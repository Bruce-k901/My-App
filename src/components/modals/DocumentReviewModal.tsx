'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Upload, FileText, Archive } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface DocumentReviewModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentName: string
  currentExpiryDate: string | null
  currentVersion: string | null
  currentFilePath: string
  onSuccess: () => void
}

type ReviewAction = 'update_expiry' | 'upload_new_version' | null

export default function DocumentReviewModal({
  isOpen,
  onClose,
  documentId,
  documentName,
  currentExpiryDate,
  currentVersion,
  currentFilePath,
  onSuccess
}: DocumentReviewModalProps) {
  const { companyId } = useAppContext()
  const [action, setAction] = useState<ReviewAction>(null)
  const [newExpiryDate, setNewExpiryDate] = useState<string>('')
  const [newVersion, setNewVersion] = useState<string>('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Initialize expiry date when modal opens
  useEffect(() => {
    if (isOpen && currentExpiryDate) {
      setNewExpiryDate(currentExpiryDate)
    }
  }, [isOpen, currentExpiryDate])

  // Auto-increment version when uploading new version
  useEffect(() => {
    if (action === 'upload_new_version' && currentVersion) {
      // Extract version number (e.g., "v1" -> 1, "vv1" -> 1)
      const versionMatch = currentVersion.match(/\d+/)
      if (versionMatch) {
        const currentVersionNum = parseInt(versionMatch[0])
        setNewVersion(`v${currentVersionNum + 1}`)
      } else {
        setNewVersion('v2')
      }
    }
  }, [action, currentVersion])

  if (!isOpen) return null

  const handleUpdateExpiry = async () => {
    if (!newExpiryDate) {
      setError('Please select a new expiry date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update the document's expiry date
      const { error: updateError } = await supabase
        .from('global_documents')
        .update({
          expiry_date: newExpiryDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) throw updateError

      toast.success('Document expiry date updated successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error updating expiry date:', err)
      setError(err.message || 'Failed to update expiry date')
      toast.error('Failed to update expiry date')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadNewVersion = async () => {
    if (!newFile) {
      setError('Please select a file to upload')
      return
    }

    if (!newVersion) {
      setError('Please enter a version number')
      return
    }

    if (!companyId) {
      setError('Company ID not available')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 1. Archive the old document to archive folder
      const oldFilePath = currentFilePath
      const archivePath = oldFilePath.replace(
        /^([^/]+\/)(.+)$/,
        `$1archive/${documentId}/$2`
      )

      // Get the old file from storage
      const { data: oldFileData, error: getError } = await supabase.storage
        .from('global_docs')
        .download(oldFilePath)

      if (getError) {
        console.warn('Could not retrieve old file for archiving:', getError)
        // Continue anyway - the old file might not exist or might already be archived
      } else if (oldFileData) {
        // Upload old file to archive location
        const { error: archiveError } = await supabase.storage
          .from('global_docs')
          .upload(archivePath, oldFileData, {
            cacheControl: '3600',
            upsert: true
          })

        if (archiveError) {
          console.warn('Could not archive old file:', archiveError)
          // Continue anyway - archiving is not critical
        }
      }

      // 2. Upload new file
      const fileExt = newFile.name.split('.').pop()
      const sanitizedFileName = newFile.name
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '_')
        .toLowerCase()
      
      const newFilePath = `${companyId}/${documentId}_${Date.now()}_${sanitizedFileName}`

      const { error: uploadError } = await supabase.storage
        .from('global_docs')
        .upload(newFilePath, newFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: newFile.type || 'application/pdf'
        })

      if (uploadError) throw uploadError

      // 3. Update document record with new file and version
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: updateError } = await supabase
        .from('global_documents')
        .update({
          file_path: newFilePath,
          version: newVersion,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.id || null,
          updated_at: new Date().toISOString(),
          // Reset expiry date - user should set new one if needed
          expiry_date: null
        })
        .eq('id', documentId)

      if (updateError) throw updateError

      toast.success('New document version uploaded and old version archived')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error uploading new version:', err)
      setError(err.message || 'Failed to upload new version')
      toast.error('Failed to upload new version')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setNewFile(file)
      setError('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#0B0D13] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review Document</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Selection */}
        {!action && (
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-600 dark:text-neutral-300 mb-4">
              How would you like to handle this document review?
            </p>
            
            <button
              onClick={() => setAction('update_expiry')}
              className="w-full p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Update Expiry Date</div>
                  <div className="text-sm text-gray-500 dark:text-neutral-400">
                    Document is still relevant, just extend the expiry date
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAction('upload_new_version')}
              className="w-full p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-green-500 dark:text-green-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Upload New Version</div>
                  <div className="text-sm text-gray-500 dark:text-neutral-400">
                    Replace with updated document (old version will be archived)
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Update Expiry Form */}
        {action === 'update_expiry' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                New Expiry Date
              </label>
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#D37E91]"
                min={new Date().toISOString().split('T')[0]}
              />
              {currentExpiryDate && (
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  Current expiry: {new Date(currentExpiryDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleUpdateExpiry}
                disabled={loading || !newExpiryDate}
                className="flex-1"
              >
                {loading ? 'Updating...' : 'Update Expiry Date'}
              </Button>
              <Button
                onClick={() => {
                  setAction(null)
                  setError('')
                }}
                variant="outline"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Upload New Version Form */}
        {action === 'upload_new_version' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Version Number
              </label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="e.g., v2, v3"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#D37E91]"
              />
              {currentVersion && (
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                  Current version: {currentVersion}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                New Document File
              </label>
              <div className="border border-gray-300 dark:border-white/[0.06] border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="new-document-file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <label
                  htmlFor="new-document-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400 dark:text-neutral-400" />
                  <span className="text-sm text-gray-600 dark:text-neutral-300">
                    {newFile ? newFile.name : 'Click to select file'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-neutral-400">
                    PDF, Word, Excel, or Image (max 10MB)
                  </span>
                </label>
              </div>
              {newFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <FileText className="h-4 w-4" />
                  {newFile.name} ({(newFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Archive className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  <strong>Note:</strong> The current version will be automatically moved to the archive folder when you upload the new version.
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleUploadNewVersion}
                disabled={loading || !newFile || !newVersion}
                className="flex-1"
              >
                {loading ? 'Uploading...' : 'Upload New Version'}
              </Button>
              <Button
                onClick={() => {
                  setAction(null)
                  setNewFile(null)
                  setError('')
                }}
                variant="outline"
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Cancel button when no action selected */}
        {!action && (
          <div className="mt-6">
            <Button onClick={onClose} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

