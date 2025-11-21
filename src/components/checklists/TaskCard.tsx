'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar, Camera, Thermometer, FileText, Lightbulb, ExternalLink, ArrowRight } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskStatus } from '@/types/checklist-types'
import { supabase } from '@/lib/supabase'
import { calculateTaskTiming, TaskTimingStatus } from '@/utils/taskTiming'
import Link from 'next/link'

interface TaskCardProps {
  task: ChecklistTaskWithTemplate
  onClick: () => void
  showDetailLink?: boolean
}

interface TempWarning {
  status: 'warning' | 'failed'
  reading: number
  recorded_at: string
  asset_name?: string
}

export default function TaskCard({ task, onClick, showDetailLink = true }: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.status === 'overdue' // Check for overdue status set by Edge Function
  const isCritical = task.template?.is_critical
  const [tempWarning, setTempWarning] = useState<TempWarning | null>(null)
  const templateNote = task.template_notes || task.template?.notes || null
  
  // Get navigation link for generic tasks
  const getGenericTaskLink = () => {
    const taskData = task.task_data as any
    if (!taskData?.source_type) return null
    
    switch (taskData.source_type) {
      case 'certificate_expiry':
        // Link to training page with profile_id query param
        if (taskData.profile_id) {
          return `/dashboard/training?profile_id=${taskData.profile_id}&certificate_type=${taskData.certificate_type || ''}`
        }
        return '/dashboard/training'
      
      case 'sop_review':
        // Link to SOPs list with sop_id query param
        if (taskData.sop_id) {
          return `/dashboard/sops/list?sop_id=${taskData.sop_id}`
        }
        return '/dashboard/sops/list'
      
      case 'document_expiry':
        // Link to documents page with document_id query param
        if (taskData.document_id) {
          return `/dashboard/documents?document_id=${taskData.document_id}`
        }
        return '/dashboard/documents'
      
      case 'ppm_overdue':
        // Link to PPM schedule page with asset_id query param
        // PPM tasks use source_id (not asset_id) - this is the asset ID
        if (taskData.source_id || taskData.asset_id) {
          const assetId = taskData.source_id || taskData.asset_id
          return `/dashboard/ppm?asset_id=${assetId}`
        }
        return '/dashboard/ppm'
      
      default:
        return null
    }
  }
  
  const genericTaskLink = getGenericTaskLink()
  
  // Calculate task timing status
  const timing = !isCompleted 
    ? calculateTaskTiming(task.due_date, task.due_time || null)
    : null
  const timingStatus: TaskTimingStatus | null = timing?.status || null

  // Fetch recent temperature warnings for linked asset
  useEffect(() => {
    const fetchTempWarnings = async () => {
      // Only fetch if task has a linked asset and isn't completed
      if (!task.template?.asset_id || isCompleted) {
        setTempWarning(null)
        return
      }

      try {
        // Get recent temperature logs (last 24 hours) for this asset with warnings/failures
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        const { data, error } = await supabase
          .from('temperature_logs')
          .select(`
            status,
            reading,
            recorded_at,
            assets(name)
          `)
          .eq('asset_id', task.template.asset_id)
          .eq('site_id', task.site_id)
          .in('status', ['warning', 'failed'])
          .gte('recorded_at', yesterday.toISOString())
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Error fetching temperature warnings:', error)
          setTempWarning(null)
          return
        }

        if (data) {
          const asset = Array.isArray(data.assets) ? data.assets[0] : data.assets
          setTempWarning({
            status: data.status as 'warning' | 'failed',
            reading: data.reading,
            recorded_at: data.recorded_at,
            asset_name: asset?.name
          })
        } else {
          setTempWarning(null)
        }
      } catch (error) {
        console.error('Error fetching temperature warnings:', error)
      }
    }

    fetchTempWarnings()
  }, [task.template?.asset_id, task.site_id, isCompleted])

  const isMonitoringTask = task.flagged && task.flag_reason === 'monitoring'
  const isLateCompleted = task.flagged && task.flag_reason === 'completed_late'
  const isEarlyCompleted = task.flagged && task.flag_reason === 'completed_early'

  const getStatusColor = () => {
    if (isCompleted) return 'border-green-500/50 bg-green-500/10'
    // Overdue status (set by Edge Function) - highest priority styling
    if (isOverdue) return 'border-red-600/60 bg-red-600/20 shadow-red-600/20'
    if (isMonitoringTask) return 'border-orange-500/50 bg-orange-500/10' // Orange border for monitoring tasks
    if (tempWarning?.status === 'failed') return 'border-red-500/50 bg-red-500/10'
    if (tempWarning?.status === 'warning') return 'border-orange-500/50 bg-orange-500/10'
    
    // Task timing status (pending/due/late)
    if (timingStatus === 'late') return 'border-red-500/50 bg-red-500/10'
    if (timingStatus === 'due') return 'border-green-500/50 bg-green-500/10'
    if (timingStatus === 'pending') return 'border-yellow-500/50 bg-yellow-500/10'
    
    if (isCritical) return 'border-orange-500/50 bg-orange-500/10'
    return 'border-neutral-700 hover:border-pink-400/50'
  }

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle2 className="h-5 w-5 text-green-400" />
    // Overdue status (set by Edge Function) - highest priority icon
    if (isOverdue) return <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
    if (tempWarning?.status === 'failed') return <AlertCircle className="h-5 w-5 text-red-400" />
    if (tempWarning?.status === 'warning') return <AlertCircle className="h-5 w-5 text-orange-400" />
    
    // Task timing status
    if (timingStatus === 'late') return <AlertCircle className="h-5 w-5 text-red-400" />
    if (timingStatus === 'due') return <Clock className="h-5 w-5 text-green-400" />
    if (timingStatus === 'pending') return <Clock className="h-5 w-5 text-yellow-400" />
    
    if (isCritical) return <AlertCircle className="h-5 w-5 text-orange-400" />
    return <Clock className="h-5 w-5 text-neutral-400" />
  }
  
  const getTimingStatusLabel = () => {
    if (isCompleted) return null
    if (timingStatus === 'late') return 'Late'
    if (timingStatus === 'due') return 'Due'
    if (timingStatus === 'pending') return 'Pending'
    return null
  }

  const getEvidenceIcons = () => {
    if (!task.template?.evidence_types) return null
    
    return task.template.evidence_types.map((type, index) => {
      switch (type) {
        case 'photo':
          return <Camera key={index} className="h-3 w-3 text-neutral-400" />
        case 'temperature':
          return <Thermometer key={index} className="h-3 w-3 text-neutral-400" />
        case 'text_note':
          return <FileText key={index} className="h-3 w-3 text-neutral-400" />
        default:
          return null
      }
    })
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking the detail link, don't trigger onClick
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-neutral-800/50 backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg relative ${getStatusColor()}`}
    >
      {showDetailLink && (
        <Link
          href={`/dashboard/tasks/view/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors z-10"
          title="View task details"
        >
          <ExternalLink className="w-4 h-4 text-white/60 hover:text-white" />
        </Link>
      )}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${isOverdue ? 'text-red-300 font-semibold' : 'text-white'}`}>
            {task.custom_name || task.template?.name || 'Unknown Task'}
            {isOverdue && (
              <span className="ml-2 text-xs text-red-400 font-semibold">OVERDUE</span>
            )}
            {isMonitoringTask && (
              <span className="ml-2 text-xs text-orange-400 font-normal">(Monitoring)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getEvidenceIcons()}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-neutral-400 line-clamp-2">
          {task.custom_instructions || task.template?.description || 'No description available'}
        </p>

        {/* Generic Task Navigation Link */}
        {genericTaskLink && (
          <Link
            href={genericTaskLink}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-medium"
          >
            <ArrowRight className="w-3 h-3" />
            {task.task_data?.source_type === 'certificate_expiry' && 'View Training Details'}
            {task.task_data?.source_type === 'sop_review' && 'Review SOP'}
            {task.task_data?.source_type === 'document_expiry' && 'Review Document'}
            {task.task_data?.source_type === 'ppm_overdue' && 'View PPM Schedule'}
          </Link>
        )}

        {templateNote && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-100/90 text-xs p-3 flex gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
            <div>
              <p className="font-medium text-amber-200 mb-1">Template note</p>
              <p className="whitespace-pre-wrap leading-relaxed">{templateNote}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{task.due_time || 'Anytime'}</span>
          </div>
        </div>

        {task.template?.compliance_standard && (
          <div className="text-xs text-neutral-500">
            {task.template.compliance_standard}
          </div>
        )}

        {isCompleted && task.completed_at && (
          <div className={`text-xs ${
            isLateCompleted ? 'text-red-400' :
            isEarlyCompleted ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            Completed at {new Date(task.completed_at).toLocaleTimeString()}
            {isLateCompleted && ' ⚠️ Late'}
            {isEarlyCompleted && ' ⚠️ Early'}
          </div>
        )}

        {/* Status tags removed per user request */}

        {tempWarning && !isCompleted && (
          <div className={`text-xs font-medium flex items-center gap-2 ${
            tempWarning.status === 'failed' 
              ? 'text-red-400' 
              : 'text-orange-400'
          }`}>
            <Thermometer className="h-3 w-3" />
            <span>
              {tempWarning.status === 'failed' ? '❌' : '⚠️'} Temp: {tempWarning.reading}°C 
              {tempWarning.asset_name && ` (${tempWarning.asset_name})`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
