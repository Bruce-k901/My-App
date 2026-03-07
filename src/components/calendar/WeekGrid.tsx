'use client'

import { format, isToday, isSameDay } from 'date-fns'
import type { CalendarEvent } from '@/types/calendar'
import { DayColumn } from './DayColumn'

interface WeekGridProps {
  weekDays: Date[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  selectedDate: Date
  selectedEventId?: string
  onSelectEvent: (event: CalendarEvent) => void
}

export function WeekGrid({ weekDays, getEventsForDate, selectedDate, selectedEventId, onSelectEvent }: WeekGridProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#101214]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/[0.06]">
        {weekDays.map(day => {
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          return (
            <div
              key={day.toISOString()}
              className="py-2.5 px-2 text-center border-r border-gray-200 dark:border-white/[0.06] last:border-r-0"
            >
              <div className={`text-[0.6rem] font-semibold uppercase tracking-wider mb-1 ${
                today ? 'text-brand-cta' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {format(day, 'EEE')}
              </div>
              <div className={`
                text-lg font-light tracking-tight leading-none
                w-[34px] h-[34px] flex items-center justify-center
                rounded-full mx-auto cursor-pointer transition-all
                ${today
                  ? 'bg-brand-cta text-white font-semibold'
                  : selected
                    ? 'bg-brand-cta/10 text-brand-cta'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                }
              `}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {weekDays.map(day => (
          <DayColumn
            key={day.toISOString()}
            date={day}
            events={getEventsForDate(day)}
            selectedDate={selectedDate}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </div>
  )
}
