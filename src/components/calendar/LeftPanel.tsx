'use client'

import type { CalendarEvent } from '@/types/calendar'
import { useAppContext } from '@/context/AppContext'
import { MiniCalendar } from './MiniCalendar'
import { PrioritiesFeed } from './PrioritiesFeed'
import { MessagesPreview } from './MessagesPreview'
import { GearSix } from '@phosphor-icons/react'

interface LeftPanelProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  todayEvents: CalendarEvent[]
  datesWithEvents: Set<string>
  onSelectEvent: (event: CalendarEvent) => void
  onSelectThread: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function LeftPanel({
  selectedDate,
  onSelectDate,
  todayEvents,
  datesWithEvents,
  onSelectEvent,
  onSelectThread,
}: LeftPanelProps) {
  const { profile, company } = useAppContext()

  const fullName = profile?.full_name || 'User'
  const initials = getInitials(fullName)
  const role = profile?.app_role || 'Staff'
  const companyName = company?.name || ''

  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] border-r border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden">
      <MiniCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        datesWithEvents={datesWithEvents}
      />

      <PrioritiesFeed
        events={todayEvents}
        onSelectEvent={onSelectEvent}
      />

      <MessagesPreview onSelectThread={onSelectThread} />

      <div className="flex-1" />

      {/* User block */}
      <div className="px-4 py-3.5 border-t border-gray-200 dark:border-white/[0.06] flex items-center gap-2">
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-brand-cta to-[#6E2222] text-white flex items-center justify-center text-[0.65rem] font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.75rem] font-medium text-gray-900 dark:text-gray-100">{fullName}</div>
          <div className="text-[0.62rem] text-gray-400 dark:text-gray-500">{role}{companyName ? ` · ${companyName}` : ''}</div>
        </div>
        <button className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-all">
          <GearSix size={14} />
        </button>
      </div>
    </div>
  )
}
