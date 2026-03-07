'use client'

import { format, isToday, isSameDay, isSameMonth } from 'date-fns'
import type { CalendarEvent } from '@/types/calendar'
import { MODULE_HEX } from '@/config/module-colors'

interface MonthGridProps {
  currentDate: Date
  monthDays: Date[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  datesWithEvents: Set<string>
  selectedEventId?: string
  onSelectDate: (date: Date) => void
  onSelectEvent: (event: CalendarEvent) => void
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthGrid({
  currentDate,
  monthDays,
  getEventsForDate,
  datesWithEvents,
  selectedEventId,
  onSelectDate,
  onSelectEvent,
}: MonthGridProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#101214]">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/[0.06]">
        {DOW_LABELS.map(label => (
          <div
            key={label}
            className="py-2 text-center text-[0.6rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {monthDays.map(day => {
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const events = getEventsForDate(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`
                border-b border-r border-gray-200 dark:border-white/[0.06]
                min-h-[80px] lg:min-h-[100px] p-1.5 cursor-pointer transition-colors
                ${!inMonth ? 'bg-gray-50/50 dark:bg-white/[0.01]' : ''}
                ${today ? 'bg-brand-cta/[0.03] dark:bg-brand-cta/[0.04]' : ''}
                ${!today && inMonth ? 'hover:bg-gray-50/70 dark:hover:bg-white/[0.02]' : ''}
              `}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-[0.72rem] w-[24px] h-[24px] flex items-center justify-center rounded-full
                    ${today ? 'bg-brand-cta text-white font-semibold' : ''}
                    ${!today && inMonth ? 'text-gray-700 dark:text-gray-300' : ''}
                    ${!inMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                  `}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Event indicators — show up to 3, then "+N more" */}
              <div className="flex flex-col gap-px">
                {events.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    onClick={e => { e.stopPropagation(); onSelectEvent(event) }}
                    className={`
                      w-full text-left rounded-[3px] px-1 py-px truncate
                      text-[0.58rem] leading-tight cursor-pointer transition-colors
                      ${event.id === selectedEventId ? 'ring-1 ring-brand-cta/40' : ''}
                    `}
                    style={{
                      backgroundColor: `${MODULE_HEX[event.module].mid}12`,
                      color: MODULE_HEX[event.module].mid,
                    }}
                  >
                    {event.startTime ? `${event.startTime} ` : ''}{event.title}
                  </button>
                ))}
                {events.length > 3 && (
                  <div className="text-[0.55rem] text-gray-400 dark:text-gray-500 pl-1">
                    +{events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
