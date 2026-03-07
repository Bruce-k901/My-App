'use client'

import { format, isToday } from 'date-fns'
import type { CalendarEvent } from '@/types/calendar'
import { EventCard } from './EventCard'
import { CalendarBlank } from '@phosphor-icons/react'

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  selectedEventId?: string
  onSelectEvent: (event: CalendarEvent) => void
}

export function DayView({ date, events, selectedEventId, onSelectEvent }: DayViewProps) {
  const today = isToday(date)
  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents = events.filter(e => !e.allDay)

  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-gray-400 dark:text-gray-500">
        <CalendarBlank size={36} weight="light" />
        <div className="text-[0.82rem]">No events for {format(date, 'EEEE d MMMM')}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#101214]">
      {/* Day header */}
      <div className="px-5 lg:px-8 pt-4 pb-3 border-b border-gray-200 dark:border-white/[0.06]">
        <div className={`text-[0.6rem] font-semibold uppercase tracking-wider mb-0.5 ${today ? 'text-brand-cta' : 'text-gray-400 dark:text-gray-500'}`}>
          {format(date, 'EEEE')}
        </div>
        <div className={`text-2xl font-light tracking-tight ${today ? 'text-brand-cta' : 'text-gray-900 dark:text-gray-100'}`}>
          {format(date, 'd MMMM')}
        </div>
        <div className="text-[0.7rem] text-gray-400 dark:text-gray-500 mt-0.5">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="px-5 lg:px-8 py-4 max-w-2xl">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="mb-4">
            <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              All day
            </div>
            <div className="flex flex-col gap-1">
              {allDayEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={event.id === selectedEventId}
                  onClick={onSelectEvent}
                  animationDelay={0.05 + i * 0.03}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timed events */}
        {timedEvents.length > 0 && (
          <div>
            {allDayEvents.length > 0 && (
              <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                Scheduled
              </div>
            )}
            <div className="flex flex-col gap-1">
              {timedEvents.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={event.id === selectedEventId}
                  onClick={onSelectEvent}
                  animationDelay={0.05 + i * 0.03}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
