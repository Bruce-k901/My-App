'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePanelStore } from '@/lib/stores/panel-store'
import { Messaging } from './Messaging'

export function MessagingPanel() {
  const { messagingOpen, setMessagingOpen } = usePanelStore()

  return (
    <Sheet open={messagingOpen} onOpenChange={setMessagingOpen}>
      <SheetContent 
        side="right" 
        className="w-full md:w-[85vw] lg:w-[900px] xl:w-[1100px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.1]">
          <SheetTitle>Messages</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <Messaging />
        </div>
      </SheetContent>
    </Sheet>
  )
}
