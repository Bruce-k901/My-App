'use client'

import { MessageSquare, Calendar } from 'lucide-react'
import { usePanelStore } from '@/lib/stores/panel-store'
import { cn } from '@/lib/utils'

export function GlobalActions() {
  const { setMessagingOpen, setCalendarOpen } = usePanelStore()

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2 z-40">
      {/* Messaging Button */}
      <button
        onClick={() => setMessagingOpen(true)}
        className={cn(
          "group relative",
          "w-11 h-11 rounded-lg",
          "bg-white/80 dark:bg-[#0B0D13]/80 backdrop-blur-lg",
          "border border-gray-200/50 dark:border-white/[0.1]",
          "shadow-lg",
          "transition-all duration-300 ease-out",
          "hover:bg-purple-500/20 hover:border-purple-500/50",
          "hover:shadow-xl hover:shadow-purple-500/20",
          "hover:scale-110",
          "active:scale-95",
          "flex items-center justify-center"
        )}
        title="Open Messages"
      >
        <MessageSquare className="h-5 w-5 text-gray-600 dark:text-white/60 group-hover:text-purple-400 transition-colors" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-2.5 py-1.5 bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0 shadow-lg border border-gray-200 dark:border-white/[0.1]">
          Messages
        </div>
      </button>

      {/* Calendar Button */}
      <button
        onClick={() => setCalendarOpen(true)}
        className={cn(
          "group relative",
          "w-11 h-11 rounded-lg",
          "bg-white/80 dark:bg-[#0B0D13]/80 backdrop-blur-lg",
          "border border-gray-200/50 dark:border-white/[0.1]",
          "shadow-lg",
          "transition-all duration-300 ease-out",
          "hover:bg-teal-500/20 hover:border-teal-500/50",
          "hover:shadow-xl hover:shadow-teal-500/20",
          "hover:scale-110",
          "active:scale-95",
          "flex items-center justify-center"
        )}
        title="Open Calendar"
      >
        <Calendar className="h-5 w-5 text-gray-600 dark:text-white/60 group-hover:text-teal-400 transition-colors" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-2.5 py-1.5 bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none translate-x-2 group-hover:translate-x-0 shadow-lg border border-gray-200 dark:border-white/[0.1]">
          Calendar
        </div>
      </button>
    </div>
  )
}
