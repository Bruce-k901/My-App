import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'

interface PPMRealtimeOptions {
  onPPMUpdate?: () => void
  onTaskUpdate?: () => void
  onNotificationUpdate?: () => void
  companyId?: string
  siteId?: string
}

export function usePPMRealtime({
  onPPMUpdate,
  onTaskUpdate,
  onNotificationUpdate,
  companyId,
  siteId
}: PPMRealtimeOptions = {}) {
  const { showToast } = useToast()

  const handlePPMChange = useCallback((payload: any) => {
    console.log('PPM change detected:', payload)
    
    // Show toast for status changes
    if (payload.eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) {
      const assetName = payload.new?.asset_name || 'Asset'
      const newStatus = payload.new?.status
      
      let message = ''
      let type: 'success' | 'error' | 'info' | 'warning' = 'info'
      
      switch (newStatus) {
        case 'completed':
          message = `PPM completed for ${assetName}`
          type = 'success'
          break
        case 'overdue':
          message = `PPM overdue for ${assetName}`
          type = 'error'
          break
        case 'due_soon':
          message = `PPM due soon for ${assetName}`
          type = 'warning'
          break
        default:
          message = `PPM status updated for ${assetName}`
      }
      
      showToast({
        title: 'PPM Status Update',
        description: message,
        type
      })
    }
    
    onPPMUpdate?.()
  }, [onPPMUpdate, showToast])

  const handleTaskChange = useCallback((payload: any) => {
    console.log('Task change detected:', payload)
    
    // Show toast for PPM task completions
    if (payload.eventType === 'UPDATE' && 
        payload.new?.task_type === 'ppm' && 
        payload.old?.status !== 'completed' && 
        payload.new?.status === 'completed') {
      showToast({
        title: 'PPM Task Completed',
        description: `${payload.new?.name || 'PPM task'} has been completed`,
        type: 'success'
      })
    }
    
    onTaskUpdate?.()
  }, [onTaskUpdate, showToast])

  const handleNotificationChange = useCallback((payload: any) => {
    console.log('Notification change detected:', payload)
    
    // Show toast for new PPM notifications
    if (payload.eventType === 'INSERT' && 
        payload.new?.type?.startsWith('ppm_')) {
      const severity = payload.new?.severity || 'info'
      
      showToast({
        title: payload.new?.title || 'PPM Notification',
        description: payload.new?.message,
        type: severity === 'high' ? 'error' : 'info'
      })
    }
    
    onNotificationUpdate?.()
  }, [onNotificationUpdate, showToast])

  useEffect(() => {
    const channels: any[] = []

    // Subscribe to PPM schedule changes
    const ppmChannel = supabase
      .channel('ppm_schedule_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ppm_schedule',
          ...(companyId && { filter: `company_id=eq.${companyId}` })
        },
        handlePPMChange
      )
      .subscribe()
    
    channels.push(ppmChannel)

    // Subscribe to task changes (PPM tasks)
    const taskChannel = supabase
      .channel('ppm_task_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: 'task_type=eq.ppm'
        },
        handleTaskChange
      )
      .subscribe()
    
    channels.push(taskChannel)

    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('ppm_notification_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(companyId && { filter: `company_id=eq.${companyId}` })
        },
        handleNotificationChange
      )
      .subscribe()
    
    channels.push(notificationChannel)

    return () => {
      channels.forEach(channel => channel.unsubscribe())
    }
  }, [companyId, siteId, handlePPMChange, handleTaskChange, handleNotificationChange])

  return {
    // Utility function to manually trigger refresh
    refreshPPMData: useCallback(() => {
      onPPMUpdate?.()
      onTaskUpdate?.()
      onNotificationUpdate?.()
    }, [onPPMUpdate, onTaskUpdate, onNotificationUpdate])
  }
}