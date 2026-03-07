'use client'

import type { CalendarEvent } from '@/types/calendar'

/** Module → Tailwind class mappings for event cards */
const MODULE_CARD_STYLES: Record<string, { bg: string; border: string; time: string }> = {
  checkly: {
    bg: 'bg-checkly-mid/[0.06] dark:bg-checkly/[0.06]',
    border: 'border-l-checkly-mid',
    time: 'text-checkly-mid',
  },
  stockly: {
    bg: 'bg-stockly-mid/[0.08] dark:bg-stockly-mid/[0.08]',
    border: 'border-l-stockly-mid',
    time: 'text-stockly-mid',
  },
  teamly: {
    bg: 'bg-teamly-mid/[0.06] dark:bg-teamly/[0.06]',
    border: 'border-l-teamly-mid',
    time: 'text-teamly-mid',
  },
  planly: {
    bg: 'bg-planly-mid/[0.08] dark:bg-planly-mid/[0.08]',
    border: 'border-l-planly-mid',
    time: 'text-planly-mid',
  },
  assetly: {
    bg: 'bg-assetly-mid/[0.08] dark:bg-assetly-mid/[0.08]',
    border: 'border-l-assetly-mid',
    time: 'text-assetly-mid',
  },
  msgly: {
    bg: 'bg-msgly-mid/[0.08] dark:bg-msgly/[0.06]',
    border: 'border-l-msgly-mid',
    time: 'text-msgly-mid',
  },
}

interface EventCardProps {
  event: CalendarEvent
  isSelected?: boolean
  onClick?: (event: CalendarEvent) => void
  animationDelay?: number
}

export function EventCard({ event, isSelected, onClick, animationDelay = 0 }: EventCardProps) {
  const styles = MODULE_CARD_STYLES[event.module] || MODULE_CARD_STYLES.checkly

  const timeDisplay = event.allDay
    ? 'All day'
    : event.endTime
      ? `${event.startTime}–${event.endTime}`
      : event.startTime
        ? event.startTime
        : ''

  return (
    <div
      className={`
        rounded-[5px] py-1.5 px-2 mb-1 cursor-pointer
        border-l-[2.5px] ${styles.border} ${styles.bg}
        transition-all duration-150 ease-out
        hover:translate-x-[1px] hover:brightness-[0.97]
        ${isSelected ? 'shadow-md translate-x-[1px]' : ''}
      `}
      style={{ animationDelay: `${animationDelay}s` }}
      onClick={() => onClick?.(event)}
    >
      {timeDisplay && (
        <div className={`text-[0.58rem] font-semibold opacity-65 mb-px tracking-wide ${styles.time}`}>
          {event.endTime && event.startTime ? `${event.startTime}–${event.endTime}` : timeDisplay}
        </div>
      )}
      <div className="text-[0.7rem] font-medium text-gray-900 dark:text-gray-100 leading-tight">
        {event.title}
      </div>
      {event.subtitle && (
        <div className="text-[0.6rem] text-gray-500 dark:text-gray-400 mt-px">
          {event.subtitle}
        </div>
      )}
      {event.status && event.status !== 'complete' && (
        <StatusPip status={event.status} />
      )}
    </div>
  )
}

function StatusPip({ status }: { status: string }) {
  const config = {
    confirmed: { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'Confirmed' },
    pending: { color: 'bg-amber-500', text: 'text-amber-500', label: status === 'pending' ? 'Pending' : 'Due now' },
    overdue: { color: 'bg-red-500', text: 'text-red-500', label: 'Overdue' },
  }[status] || { color: 'bg-gray-400', text: 'text-gray-400', label: status }

  return (
    <div className={`inline-flex items-center gap-1 mt-1 text-[0.58rem] font-medium ${config.text}`}>
      <div className={`w-[5px] h-[5px] rounded-full ${config.color}`} />
      {config.label}
    </div>
  )
}
