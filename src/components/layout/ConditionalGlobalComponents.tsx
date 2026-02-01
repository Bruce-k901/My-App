'use client'

import { usePathname } from 'next/navigation'
import { MessagingPanel } from '@/components/messaging/messaging-panel'
import { CalendarPanel } from '@/components/calendar/calendar-panel'
import { GlobalActions } from './global-actions'

export function ConditionalGlobalComponents() {
  const pathname = usePathname()
  
  // Only show messaging/calendar on dashboard pages
  const isDashboardPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/learn')
  
  if (!isDashboardPage) {
    return null
  }

  return (
    <>
      {/* Global slide-in panels */}
      <MessagingPanel />
      <CalendarPanel />
      
      {/* Middle-right trigger buttons - only on dashboard */}
      <GlobalActions />
    </>
  )
}
