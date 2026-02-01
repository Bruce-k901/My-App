'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { usePanelStore } from '@/lib/stores/panel-store'
import { Messaging } from './Messaging'
import { Menu, X } from 'lucide-react'
import { useMobileNav } from '@/components/mobile/MobileNavProvider'
import { useIsMobile } from '@/hooks/useIsMobile'

export function MessagingPanel() {
  const { messagingOpen, setMessagingOpen } = usePanelStore()
  const { openMoreSheet } = useMobileNav()
  const { isMobile } = useIsMobile()

  return (
    <Sheet open={messagingOpen} onOpenChange={setMessagingOpen}>
      <SheetContent
        side="right"
        className="w-full md:w-[85vw] lg:w-[900px] xl:w-[1100px] p-0 flex flex-col bg-white dark:bg-[#0a0a0a]"
      >
        <SheetHeader className="px-4 py-4 border-b border-gray-200 dark:border-white/[0.1] flex-row items-center justify-between">
          <SheetTitle className="text-gray-900 dark:text-white">Messages</SheetTitle>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => openMoreSheet()}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label="Quick Access"
              >
                <Menu size={20} />
              </button>
            )}
            <button
              onClick={() => setMessagingOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
          <Messaging />
        </div>
      </SheetContent>
    </Sheet>
  )
}
