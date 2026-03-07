'use client'

import { useState, useCallback } from 'react'
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import type { CalendarEventType, CalendarViewMode } from '@/types/calendar'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useDetailPanel } from '@/hooks/useDetailPanel'
import { useIsMobile } from '@/hooks/useIsMobile'
import { LeftPanel } from './LeftPanel'
import { CalendarHeader } from './CalendarHeader'
import { FilterBar } from './FilterBar'
import { WeekGrid } from './WeekGrid'
import { DayView } from './DayView'
import { MonthGrid } from './MonthGrid'
import { DetailPanel } from './DetailPanel'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import type { ModalContext } from '@/components/tasks/CreateTaskModal'
import { Messaging } from '@/components/messaging'
import { List, X, ArrowLeft } from '@phosphor-icons/react'

const ALL_FILTERS: CalendarEventType[] = ['compliance', 'delivery', 'task', 'message', 'leave']

export function CalendarShell() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [activeFilters, setActiveFilters] = useState<CalendarEventType[]>([...ALL_FILTERS])
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [showMessaging, setShowMessaging] = useState(false)
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  const {
    weekDays,
    monthDays,
    getEventsForDate,
    todayEvents,
    datesWithEvents,
    isLoading,
  } = useCalendarEvents({ currentDate, viewMode, filters: activeFilters })

  const {
    activeTab,
    selectedEvent,
    isExpanded,
    selectEvent,
    selectThread,
    setTab,
    toggleExpand,
  } = useDetailPanel()

  const handleToggleFilter = useCallback((type: CalendarEventType) => {
    setActiveFilters(prev =>
      prev.includes(type)
        ? prev.filter(f => f !== type)
        : [...prev, type]
    )
  }, [])

  const handlePrev = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'day': return subDays(prev, 1)
        case 'week': return subWeeks(prev, 1)
        case 'month': return subMonths(prev, 1)
      }
    })
  }, [viewMode])

  const handleNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'day': return addDays(prev, 1)
        case 'week': return addWeeks(prev, 1)
        case 'month': return addMonths(prev, 1)
      }
    })
  }, [viewMode])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleSelectDate = useCallback((date: Date) => {
    setCurrentDate(date)
    if (isMobile) setMobileDrawerOpen(false)
  }, [isMobile])

  // When clicking a date in month view, switch to day view for that date
  const handleMonthDateClick = useCallback((date: Date) => {
    setCurrentDate(date)
    setViewMode('day')
  }, [])

  const handleSelectEvent = useCallback((event: Parameters<typeof selectEvent>[0]) => {
    selectEvent(event)
    if (isMobile) setMobileDrawerOpen(false)
  }, [selectEvent, isMobile])

  // Add event modal
  const handleAddEvent = useCallback(() => {
    setAddEventOpen(true)
  }, [])

  const handleTaskCreated = useCallback(() => {
    // Invalidate all calendar queries so new events appear immediately
    queryClient.invalidateQueries({ queryKey: ['calendar-checks'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-deliveries'] })
    queryClient.invalidateQueries({ queryKey: ['calendar-leave'] })
  }, [queryClient])

  const handleOpenMessaging = useCallback(() => {
    setShowMessaging(true)
  }, [])

  const handleCloseMessaging = useCallback(() => {
    setShowMessaging(false)
  }, [])

  const modalContext: ModalContext = {
    source: 'calendar',
    preSelectedDate: currentDate,
  }

  return (
    <div
      className="w-full h-full bg-white dark:bg-[#101214] overflow-hidden grid grid-cols-1 lg:grid-cols-[260px_1fr]"
    >
      {/* Left panel — desktop: inline column, mobile: slide-out drawer */}
      <div className="hidden lg:block h-full">
        <LeftPanel
          selectedDate={currentDate}
          onSelectDate={handleSelectDate}
          todayEvents={todayEvents}
          datesWithEvents={datesWithEvents}
          onSelectEvent={handleSelectEvent}
          onSelectThread={() => { handleOpenMessaging(); if (isMobile) setMobileDrawerOpen(false) }}
        />
      </div>

      {/* Mobile drawer backdrop + panel */}
      {isMobile && mobileDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[59] lg:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[280px] z-[60] bg-white dark:bg-[#101214] shadow-xl lg:hidden overflow-y-auto">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <LeftPanel
              selectedDate={currentDate}
              onSelectDate={handleSelectDate}
              todayEvents={todayEvents}
              datesWithEvents={datesWithEvents}
              onSelectEvent={handleSelectEvent}
              onSelectThread={() => { handleOpenMessaging(); setMobileDrawerOpen(false) }}
            />
          </div>
        </>
      )}

      {/* Main calendar area */}
      <div className="flex flex-col overflow-hidden">
        {showMessaging ? (
          <>
            {/* Messaging header with back button */}
            <div className="px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#101214] flex items-center gap-3">
              <button
                onClick={handleCloseMessaging}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Messages
              </h2>
            </div>

            {/* Full Messaging component */}
            <div className="flex-1 overflow-hidden">
              <Messaging />
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 lg:px-6 pt-3 lg:pt-4 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#101214]">
              <div className="flex items-center gap-2">
                {/* Mobile menu button */}
                <button
                  className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  onClick={() => setMobileDrawerOpen(true)}
                >
                  <List size={18} />
                </button>
                <div className="flex-1">
                  <CalendarHeader
                    currentDate={currentDate}
                    viewMode={viewMode}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onToday={handleToday}
                    onViewChange={setViewMode}
                    onAddEvent={handleAddEvent}
                  />
                </div>
              </div>
              <div className="mt-3 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                <FilterBar
                  activeFilters={activeFilters}
                  onToggleFilter={handleToggleFilter}
                />
              </div>
            </div>

            {/* Calendar view — loading skeleton or actual view */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-brand-cta rounded-full animate-spin" />
                  <span className="text-[0.72rem]">Loading events...</span>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'day' && (
                  <DayView
                    date={currentDate}
                    events={getEventsForDate(currentDate)}
                    selectedEventId={selectedEvent?.id}
                    onSelectEvent={handleSelectEvent}
                  />
                )}

                {viewMode === 'week' && (
                  <div className="flex-1 overflow-x-auto lg:overflow-x-hidden">
                    <div className="min-w-[700px] lg:min-w-0 h-full">
                      <WeekGrid
                        weekDays={weekDays}
                        getEventsForDate={getEventsForDate}
                        selectedDate={currentDate}
                        selectedEventId={selectedEvent?.id}
                        onSelectEvent={handleSelectEvent}
                      />
                    </div>
                  </div>
                )}

                {viewMode === 'month' && (
                  <MonthGrid
                    currentDate={currentDate}
                    monthDays={monthDays}
                    getEventsForDate={getEventsForDate}
                    datesWithEvents={datesWithEvents}
                    selectedEventId={selectedEvent?.id}
                    onSelectDate={handleMonthDateClick}
                    onSelectEvent={handleSelectEvent}
                  />
                )}
              </>
            )}

            {/* Detail panel */}
            <DetailPanel
              activeTab={activeTab}
              selectedEvent={selectedEvent}
              isExpanded={isExpanded}
              todayEvents={todayEvents}
              onSetTab={setTab}
              onToggleExpand={toggleExpand}
              onOpenMessages={handleOpenMessaging}
            />
          </>
        )}
      </div>

      {/* Create task/event modal — same as old calendar */}
      <CreateTaskModal
        isOpen={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        context={modalContext}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}
