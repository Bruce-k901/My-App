'use client'

import type { CalendarEvent, CalendarEventChild, EventStatus } from '@/types/calendar'
import { MODULE_HEX, MODULE_NAMES } from '@/config/module-colors'
import { Clock, MapPin, User, ArrowRight, ChatCircle, PencilSimple, CheckCircle, Circle, Warning } from '@phosphor-icons/react'

interface DetailEventViewProps {
  event: CalendarEvent
  onOpenMessages?: () => void
}

export function DetailEventView({ event, onOpenMessages }: DetailEventViewProps) {
  const midColor = MODULE_HEX[event.module].mid
  const moduleName = MODULE_NAMES[event.module]
  const hasChildren = event.children && event.children.length > 0

  const timeDisplay = event.allDay
    ? 'All day'
    : event.status === 'pending'
      ? `${event.startTime || ''} – due now`
      : event.endTime
        ? `${event.startTime} – ${event.endTime}`
        : event.startTime || ''

  // Tasks/reminders don't belong to a specific module — use a contextual label
  const ctaLabel = event.type === 'task'
    ? (event.subtitle === 'Reminder' ? 'View reminder' : event.subtitle === 'Meeting' ? 'View meeting' : 'View task')
    : `Open in ${moduleName}`

  return (
    <div className="animate-in fade-in duration-200">
      {/* Header with colour bar */}
      <div className="flex items-start gap-4 mb-3">
        <div
          className="w-1 rounded-sm self-stretch min-h-[40px] flex-shrink-0"
          style={{ backgroundColor: midColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {event.title}
          </div>
          <div className="text-[0.75rem] text-gray-400 dark:text-gray-500 mt-0.5">
            {event.type === 'task' ? '' : `${moduleName} · `}{event.date ? formatDateLabel(event.date) : ''}
            {event.subtitle && ` · ${event.subtitle}`}
          </div>
        </div>
      </div>

      {/* Meta row — only for non-aggregate events */}
      {!hasChildren && (
        <div className="flex gap-6 mb-3">
          {timeDisplay && <MetaItem icon={<Clock size={14} />} text={timeDisplay} />}
          {event.location && <MetaItem icon={<MapPin size={14} />} text={event.location} />}
          {event.assignedTo && <MetaItem icon={<User size={14} />} text={event.assignedTo} />}
        </div>
      )}

      {/* Drill-down list for aggregate events */}
      {hasChildren && (
        <div className="mb-3 max-h-[200px] overflow-y-auto -mx-1 px-1">
          <div className="flex flex-col gap-0.5">
            {event.children!.map(child => (
              <ChildRow key={child.id} child={child} moduleColor={midColor} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900 text-[0.72rem] font-medium hover:bg-gray-700 dark:hover:bg-white transition-colors">
          <ArrowRight size={12} />
          {ctaLabel}
        </button>
        <button
          className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-[0.72rem] font-medium hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          onClick={onOpenMessages}
        >
          <ChatCircle size={12} />
          Message team
        </button>
        <button className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-[0.72rem] font-medium hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <PencilSimple size={12} />
          Edit
        </button>
      </div>
    </div>
  )
}

function ChildRow({ child, moduleColor }: { child: CalendarEventChild; moduleColor: string }) {
  const isComplete = child.status === 'confirmed' || child.status === 'complete'
  const isOverdue = child.status === 'overdue'

  // Format completion time e.g. "14:32"
  const completedTime = child.completedAt
    ? new Date(child.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  // Detect late completion: completed after due time
  const isLate = isComplete && child.completedAt && child.time && completedTime
    ? completedTime > child.time
    : false

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-gray-100/60 dark:hover:bg-white/[0.03] transition-colors">
      <StatusIcon status={child.status} />
      <div className="flex-1 min-w-0">
        <div className={`text-[0.72rem] font-medium truncate ${isComplete ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
          {child.title}
        </div>
        <div className="text-[0.62rem] truncate">
          {isComplete && child.completedBy ? (
            <span className={isLate ? 'text-amber-500' : 'text-emerald-500'}>
              {child.completedBy}{completedTime ? ` · ${completedTime}` : ''}
              {isLate ? ' · late' : ''}
            </span>
          ) : isOverdue ? (
            <span className="text-red-500 font-medium">
              Overdue{child.assignedTo ? ` · ${child.assignedTo}` : ''}
            </span>
          ) : child.assignedTo ? (
            <span className="text-gray-400 dark:text-gray-500">{child.assignedTo}</span>
          ) : null}
        </div>
      </div>
      {child.time && (
        <span className={`text-[0.62rem] flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {child.time}
        </span>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status?: EventStatus }) {
  switch (status) {
    case 'confirmed':
    case 'complete':
      return <CheckCircle size={15} weight="fill" className="text-emerald-500 flex-shrink-0" />
    case 'overdue':
      return <Warning size={15} weight="fill" className="text-red-500 flex-shrink-0" />
    case 'pending':
    default:
      return <Circle size={15} weight="regular" className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
  }
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[0.73rem] text-gray-600 dark:text-gray-300">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      {text}
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}
