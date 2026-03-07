'use client'

import type { CalendarEvent } from '@/types/calendar'
import { MODULE_HEX } from '@/config/module-colors'
import { MODULE_NAMES } from '@/config/module-colors'

interface PrioritiesFeedProps {
  events: CalendarEvent[]
  onSelectEvent: (event: CalendarEvent) => void
}

export function PrioritiesFeed({ events, onSelectEvent }: PrioritiesFeedProps) {
  // Show max 3 priorities
  const priorities = events.slice(0, 3)

  if (priorities.length === 0) return null

  return (
    <div className="px-4 pt-3">
      <div className="text-[0.6rem] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
        Today&apos;s priorities
      </div>
      {priorities.map(event => {
        const moduleHex = MODULE_HEX[event.module]
        const timeDisplay = event.allDay
          ? 'All day'
          : event.endTime
            ? `${event.startTime}–${event.endTime}`
            : event.startTime
              ? event.startTime
              : ''

        return (
          <div
            key={event.id}
            className="flex items-start gap-2 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-gray-200/50 dark:hover:bg-white/[0.05] transition-colors mb-0.5"
            onClick={() => onSelectEvent(event)}
          >
            <div
              className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: moduleHex.mid }}
            />
            <div className="min-w-0">
              <div className="text-[0.74rem] font-medium text-gray-900 dark:text-gray-100 leading-snug">
                {event.title}
              </div>
              <div className="text-[0.65rem] text-gray-400 dark:text-gray-500 mt-px">
                {MODULE_NAMES[event.module]} · {timeDisplay}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
