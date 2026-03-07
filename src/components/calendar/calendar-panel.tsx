'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePanelStore } from '@/lib/stores/panel-store'
import { CalendarShell } from './CalendarShell'

export function CalendarPanel() {
  const { calendarOpen, setCalendarOpen } = usePanelStore()

  return (
    <Sheet open={calendarOpen} onOpenChange={setCalendarOpen} modal={false}>
      <SheetContent
        side="right"
        className="w-full md:w-[95vw] lg:w-[1100px] xl:w-[1400px] max-w-[95vw] p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Calendar</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <CalendarShell />
        </div>
      </SheetContent>
    </Sheet>
  )
}
