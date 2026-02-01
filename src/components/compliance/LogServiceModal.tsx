'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Upload, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import { useAppContext } from '@/context/AppContext'

interface LogServiceModalProps {
  assetId: string
  assetName: string
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function LogServiceModal({
  assetId,
  assetName,
  isOpen,
  onClose,
  onComplete
}: LogServiceModalProps) {
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [contractorId, setContractorId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [autoCalculateNext, setAutoCalculateNext] = useState(true)
  const [contractors, setContractors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [asset, setAsset] = useState<any>(null)
  const { showToast } = useToast()
  const { companyId, siteId } = useAppContext()

  useEffect(() => {
    if (isOpen) {
      loadAsset()
      loadContractors()
    }
  }, [isOpen, assetId])

  const loadAsset = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('ppm_frequency_months, ppm_contractor_id')
        .eq('id', assetId)
        .single()

      if (error) throw error
      setAsset(data)
      if (data?.ppm_contractor_id) {
        setContractorId(data.ppm_contractor_id)
      }
    } catch (err: any) {
      console.error('Error loading asset:', err)
    }
  }

  const loadContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')

      if (error) throw error
      setContractors(data || [])
    } catch (err: any) {
      console.error('Error loading contractors:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${assetId}/${Date.now()}.${fileExt}`
      const filePath = `ppm-certificates/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err: any) {
      console.error('Error uploading file:', err)
      throw err
    }
  }

  const handleSubmit = async () => {
    if (!serviceDate) {
      setError('Please enter a service date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload file if provided
      let fileUrl: string | null = null
      if (file) {
        fileUrl = await uploadFile()
      }

      // Create service event
      console.log('DEBUG - Attempting to insert:', {
        company_id: companyId,
        site_id: siteId,
        user_id: user.id
      })

      const { data: serviceEvent, error: serviceError } = await supabase
        .from('ppm_service_events')
        .insert({
          asset_id: assetId,
          contractor_id: contractorId || null,
          service_date: serviceDate,
          notes: notes || null,
          file_url: fileUrl,
          status: 'completed',
          company_id: companyId,
          site_id: siteId,
          created_by: user.id
        })
        .select()
        .single()

      if (serviceError) throw serviceError

      // Calculate next service date if auto-calculate is enabled
      let nextServiceDate: string | null = null
      if (autoCalculateNext && asset?.ppm_frequency_months) {
        const nextDate = new Date(serviceDate)
        nextDate.setMonth(nextDate.getMonth() + asset.ppm_frequency_months)
        nextServiceDate = nextDate.toISOString().split('T')[0]
      }

      // Update asset
      const { error: assetError } = await supabase
        .from('assets')
        .update({
          last_service_date: serviceDate,
          next_service_date: nextServiceDate || undefined,
          ppm_status: 'up_to_date',
          updated_at: new Date().toISOString()
        })
        .eq('id', assetId)

      if (assetError) throw assetError

      // Mark any pending PPM overdue tasks for this asset as completed
      const { error: taskError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id
        })
        .eq('status', 'pending')
        .contains('task_data', { source_id: assetId, source_type: 'ppm_overdue' })

      if (taskError) {
        console.warn('Could not update task status:', taskError)
        // Don't throw - the service was logged successfully
      } else {
        console.log('PPM task marked as completed')
      }

      showToast('PPM service logged successfully', 'success')
      onComplete()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to log service')
      console.error('Error logging service:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const nextServiceDate = autoCalculateNext && asset?.ppm_frequency_months
    ? (() => {
        const next = new Date(serviceDate)
        next.setMonth(next.getMonth() + asset.ppm_frequency_months)
        return next.toISOString().split('T')[0]
      })()
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <h2 className="text-xl font-semibold text-white">Log PPM Service</h2>
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
          <div>
            <p className="text-sm text-neutral-400 mb-1">Asset</p>
            <p className="text-white font-medium">{assetName}</p>
          </div>

          {/* Service Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Service Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Contractor
            </label>
            <select
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select contractor</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Service notes, issues found, etc."
            />
          </div>

          {/* Certificate/Report Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Certificate/Report
            </label>
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center hover:border-neutral-600 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-neutral-400" />
                <span className="text-sm text-neutral-400">
                  {file ? file.name : 'Drag & drop file or click to browse'}
                </span>
              </label>
            </div>
          </div>

          {/* Auto-calculate Next Service */}
          {asset?.ppm_frequency_months && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCalculateNext}
                  onChange={(e) => setAutoCalculateNext(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-400 mb-1">
                    Auto-calculate next service date
                  </p>
                  {nextServiceDate && (
                    <p className="text-xs text-neutral-300">
                      {serviceDate} + {asset.ppm_frequency_months} months = {new Date(nextServiceDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </label>
            </div>
          )}

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
              disabled={loading || !serviceDate}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                'Logging...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Log Service & Complete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
