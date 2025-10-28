'use client'

import { Clock, CheckCircle2, AlertCircle, Calendar, Camera, Thermometer, FileText } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskStatus } from '@/types/checklist-types'

interface TaskCardProps {
  task: ChecklistTaskWithTemplate
  onClick: () => void
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.status === 'pending' && new Date(task.due_date) < new Date()
  const isCompleted = task.status === 'completed'
  const isCritical = task.template?.is_critical

  const getStatusColor = () => {
    if (isCompleted) return 'border-green-500/50 bg-green-500/10'
    if (isOverdue) return 'border-red-500/50 bg-red-500/10'
    if (isCritical) return 'border-orange-500/50 bg-orange-500/10'
    return 'border-neutral-700 hover:border-pink-400/50'
  }

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle2 className="h-5 w-5 text-green-400" />
    if (isOverdue) return <AlertCircle className="h-5 w-5 text-red-400" />
    if (isCritical) return <AlertCircle className="h-5 w-5 text-orange-400" />
    return <Clock className="h-5 w-5 text-neutral-400" />
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

  return (
    <div
      onClick={onClick}
      className={`bg-neutral-800/50 backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${getStatusColor()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-white">
            {task.template?.name || 'Unknown Task'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {getEvidenceIcons()}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-neutral-400 line-clamp-2">
          {task.template?.description || 'No description available'}
        </p>

        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{task.due_time || 'Anytime'}</span>
          </div>
          <span className="px-2 py-1 bg-neutral-700/50 rounded text-neutral-300">
            {task.template?.category || 'Unknown'}
          </span>
        </div>

        {task.template?.compliance_standard && (
          <div className="text-xs text-neutral-500">
            {task.template.compliance_standard}
          </div>
        )}

        {isCompleted && task.completed_at && (
          <div className="text-xs text-green-400">
            Completed at {new Date(task.completed_at).toLocaleTimeString()}
          </div>
        )}

        {isOverdue && (
          <div className="text-xs text-red-400 font-medium">
            Overdue
          </div>
        )}
      </div>
    </div>
  )
}
