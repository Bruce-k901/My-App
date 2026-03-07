'use client'

import { useState, useCallback } from 'react'
import type { CalendarEvent, DetailTab } from '@/types/calendar'

export interface DetailPanelState {
  activeTab: DetailTab
  selectedEvent: CalendarEvent | null
  isExpanded: boolean
}

export function useDetailPanel() {
  const [state, setState] = useState<DetailPanelState>({
    activeTab: 'overview',
    selectedEvent: null,
    isExpanded: false,
  })

  const selectEvent = useCallback((event: CalendarEvent) => {
    setState(prev => ({
      ...prev,
      selectedEvent: event,
      activeTab: 'detail',
      isExpanded: true,
    }))
  }, [])

  const selectThread = useCallback(() => {
    setState(prev => ({ ...prev, activeTab: 'messages' }))
  }, [])

  const setTab = useCallback((tab: DetailTab) => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  const toggleExpand = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }))
  }, [])

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedEvent: null,
      activeTab: 'overview',
    }))
  }, [])

  return {
    ...state,
    selectEvent,
    selectThread,
    setTab,
    toggleExpand,
    clearSelection,
  }
}
