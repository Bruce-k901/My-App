'use client'

import { isToday, isSameDay } from 'date-fns'
import type { CalendarEvent } from '@/types/calendar'
import { EventCard } from './EventCard'

interface DayColumnProps {
  date: Date
  events: CalendarEvent[]
  selectedDate: Date
  selectedEventId?: string
  onSelectEvent: (event: CalendarEvent) => void
}

export function DayColumn({ date, events, selectedDate, selectedEventId, onSelectEvent }: DayColumnProps) {
  const today = isToday(date)
  const selected = isSameDay(date, selectedDate)

  return (
    <div
      className={`
        border-r border-gray-200 dark:border-white/[0.06] last:border-r-0
        py-2.5 px-1.5 min-h-[180px] transition-colors cursor-pointer
        ${today ? 'bg-brand-cta/[0.02] dark:bg-brand-cta/[0.03]' : ''}
        ${selected && !today ? 'bg-brand-cta/[0.03] dark:bg-brand-cta/[0.04]' : ''}
        ${!today && !selected ? 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]' : ''}
      `}
    >
      {events.map((event, i) => (
        <EventCard
          key={event.id}
          event={event}
          isSelected={event.id === selectedEventId}
          onClick={onSelectEvent}
          animationDelay={0.05 + i * 0.03}
        />
      ))}
    </div>
  )
}
