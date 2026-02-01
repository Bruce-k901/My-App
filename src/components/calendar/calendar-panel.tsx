'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePanelStore } from '@/lib/stores/panel-store'
import CalendarWidget from '@/components/dashboard/CalendarWidget'

export function CalendarPanel() {
  const { calendarOpen, setCalendarOpen } = usePanelStore()

  return (
    <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
      <SheetContent
        side="right"
        className="w-full md:w-[95vw] lg:w-[1100px] xl:w-[1400px] max-w-[95vw] p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-white/[0.06] dark:border-white/[0.06] sr-only">
          <SheetTitle className="text-gray-900 dark:text-white">Daily Notes & Actions</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#0b0d13]">
          <CalendarWidget />
        </div>
      </SheetContent>
    </Sheet>
  )
}
