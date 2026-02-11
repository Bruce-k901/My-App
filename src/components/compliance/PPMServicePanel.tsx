'use client'

import { useState, useEffect } from 'react'
import { X, Wrench, Calendar, Phone, ExternalLink, Clock, CheckCircle2 } from '@/components/ui/icons'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import LogServiceModal from './LogServiceModal'
import CalloutModal from '@/components/modals/CalloutModal'

interface PPMServicePanelProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function PPMServicePanel({
  task,
  isOpen,
  onClose,
  onComplete
}: PPMServicePanelProps) {
  const [showLogServiceModal, setShowLogServiceModal] = useState(false)
  const [showCalloutModal, setShowCalloutModal] = useState(false)
  const [serviceHistory, setServiceHistory] = useState<any[]>([])
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const taskData = task.task_data as any
  const taskType = taskData?.task_type
const assetId = taskData?.source_id || taskData?.target_record_id || taskData?.asset_id
const isOverdue = taskType === 'ppm_service_overdue' || taskData?.source_type === 'ppm_overdue' || taskData?.is_overdue === true
  const [daysOverdue, setDaysOverdue] = useState(taskData?.days_overdue || 0)
  useEffect(() => {
    if (isOpen && assetId) {
      loadAsset()
      loadServiceHistory()
    }
  }, [isOpen, assetId])

  const loadAsset = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          category,
          serial_number,
          next_service_date,
          last_service_date,
          ppm_frequency_months,
          ppm_contractor_id,
          contractors:ppm_contractor_id (
            id,
            name
          )
        `)
        .eq('id', assetId)
        .single()

      if (error) throw error
      setAsset(data)
      
      // Calculate days overdue from asset's next_service_date
      if (data?.next_service_date) {
        const nextService = new Date(data.next_service_date)
        const today = new Date()
        const diffTime = today.getTime() - nextService.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays > 0) {
          setDaysOverdue(diffDays)
        }
      }
    } catch (err: any) {
      console.error('Error loading asset:', err)
    }
  }

  const loadServiceHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('ppm_service_events')
      .select(`
        id,
        service_date,
        notes,
        file_url,
        contractor_id
      `)
      .eq('asset_id', assetId)
      .order('service_date', { ascending: false })
      .limit(10)

    if (error) throw error
    
    // Fetch contractor names separately if needed
    const eventsWithContractors = await Promise.all(
      (data || []).map(async (event) => {
        if (event.contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('id, name')
            .eq('id', event.contractor_id)
            .single()
          return { ...event, contractors: contractor }
        }
        return { ...event, contractors: null }
      })
    )
    
    setServiceHistory(eventsWithContractors)
  } catch (err: any) {
    console.error('Error loading service history:', err)
  }
}
    
   const handleContactContractor = async () => {
    if (!asset?.contractors) {
      showToast('No contractor assigned', 'error')
      return
    }

    // Navigate to messaging or create a message
    // This would integrate with your messaging system
    showToast('Opening contractor messaging...', 'info')
  }

  const handleReschedule = async () => {
    // Open a date picker modal to reschedule
    showToast('Reschedule functionality coming soon', 'info')
  }

  const handleViewAsset = () => {
    window.open(`/dashboard/assets/${assetId}`, '_blank')
  }

  const handleServiceLogged = () => {
    loadAsset()
    loadServiceHistory()
    onComplete()
    setShowLogServiceModal(false)
  }

  if (!isOpen) return null

  const contractor = asset?.contractors
  const daysUntil = asset?.next_service_date
    ? Math.floor(
        (new Date(asset.next_service_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <Wrench className={`w-6 h-6 ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isOverdue ? 'PPM Service Overdue' : 'PPM Service Due'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Asset Info Card */}
            <div className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{asset?.name || taskData.asset_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">
                    Category: {asset?.category || taskData.asset_category}
                  </p>
                  {asset?.serial_number && (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                      Serial: {asset.serial_number}
                    </p>
                  )}
                </div>
                {isOverdue && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1">
                    <p className="text-sm font-medium text-red-400">
                      {daysOverdue} days overdue
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Service Due</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                    <p className="text-sm text-gray-900 dark:text-white">
                      {asset?.next_service_date
                        ? new Date(asset.next_service_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                    {daysUntil !== null && daysUntil > 0 && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400">({daysUntil} days)</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Last Service</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                    <p className="text-sm text-gray-900 dark:text-white">
                      {asset?.last_service_date
                        ? new Date(asset.last_service_date).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Frequency</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    Every {asset?.ppm_frequency_months || taskData.ppm_frequency_months} months
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Contractor</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {contractor?.name || taskData.contractor_name || 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-4 uppercase tracking-wide">
                Actions
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Place Callout Button - PRIMARY ACTION */}
                <button
                  onClick={() => setShowCalloutModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 rounded-lg p-4 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="w-5 h-5 text-white" />
                    <span className="font-medium text-white">Place Callout</span>
                  </div>
                  <p className="text-xs text-orange-200">
                    Book service appointment
                  </p>
                </button>

                <button
                  onClick={() => setShowLogServiceModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg p-4 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span className="font-medium text-white">Log Service</span>
                  </div>
                  <p className="text-xs text-blue-200">
                    Record completed service
                  </p>
                </button>

                <button
                  onClick={handleContactContractor}
                  className="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Phone className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
                    <span className="font-medium text-white">Contact Contractor</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Send message to {contractor?.name || 'contractor'}
                  </p>
                </button>

                <button
                  onClick={handleReschedule}
                  className="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
                    <span className="font-medium text-white">Reschedule</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Change next service date
                  </p>
                </button>

                <button
                  onClick={handleViewAsset}
                  className="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-left transition-colors col-span-2"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <ExternalLink className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
                    <span className="font-medium text-white">View Asset</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Open full asset details
                  </p>
                </button>
              </div>
            </div>

            {/* Service History */}
            {serviceHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-4 uppercase tracking-wide">
                  Service History
                </h4>
                <div className="space-y-2">
                  {serviceHistory.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4 border border-gray-200 dark:border-neutral-700"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {new Date(event.service_date).toLocaleDateString()}
                          </p>
                          {event.contractors && (
                            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                              {event.contractors.name}
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-xs text-gray-600 dark:text-neutral-300 mt-2">
                              {event.notes}
                            </p>
                          )}
                        </div>
                        {event.file_url && (
                          <a
                            href={event.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            View Certificate
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Service Modal */}
      {showLogServiceModal && (
        <LogServiceModal
          assetId={assetId}
          assetName={asset?.name || taskData.asset_name}
          isOpen={showLogServiceModal}
          onClose={() => setShowLogServiceModal(false)}
          onComplete={handleServiceLogged}
        />
      )}

      {/* Callout Modal */}
      {showCalloutModal && asset && (
        <CalloutModal
          open={showCalloutModal}
          onClose={() => {
            setShowCalloutModal(false);
            // Refresh data when callout modal closes
            loadAsset();
            loadServiceHistory();
          }}
          onCalloutSuccess={() => {
            // Called when callout is successfully created
            setShowCalloutModal(false);
            onComplete(); // Mark task complete
            onClose(); // Close the panel
          }}
          asset={{
            id: asset.id,
            name: asset.name,
            serial_number: asset.serial_number,
            site_name: task.site?.name || null,
            warranty_end: null,
            install_date: null,
            ppm_contractor_name: contractor?.name || null,
            reactive_contractor_name: null,
            warranty_contractor_name: null,
            reactive_contractor_id: null,
            requiresManualContractor: false
          }}
          requireTroubleshoot={false}
          initialCalloutType="ppm"
        />
      )}
    </>
  )
}
