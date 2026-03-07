'use client'

import { useConversations } from '@/hooks/useConversations'
import { useAppContext } from '@/context/AppContext'
import { BRAND_CTA } from '@/config/module-colors'
import { isSystemProfile } from '@/lib/oa/identity'
import { Robot } from '@phosphor-icons/react'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface MessagesPreviewProps {
  onSelectThread?: () => void
}

export function MessagesPreview({ onSelectThread }: MessagesPreviewProps) {
  const { conversations, loading } = useConversations()
  const { userId } = useAppContext()

  // Filter to unread conversations and take the first 3
  const unread = conversations
    .filter(c => (c.unread_count ?? 0) > 0)
    .slice(0, 3)

  if (loading) {
    return (
      <div className="px-4 pt-3">
        <div className="text-[0.6rem] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Unread messages
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 py-2 px-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-20 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                <div className="h-2.5 w-32 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (unread.length === 0) {
    return (
      <div className="px-4 pt-3">
        <div className="text-[0.6rem] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Unread messages
        </div>
        <div className="text-[0.65rem] text-gray-400 dark:text-gray-500 px-2.5 py-2">
          No unread messages
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3">
      <div className="text-[0.6rem] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
        Unread messages
      </div>
      {unread.map(conv => {
        // For direct channels, show the OTHER participant's name (not current user)
        const otherParticipant = conv.participants?.find(p => {
          const pid = (p as any).profile_id || p.user_id
          return pid !== userId && p.user?.full_name
        })
        const name = conv.name || otherParticipant?.user?.full_name || 'Unknown'
        const initials = getInitials(name)
        const snippet = conv.last_message?.content || ''
        const count = conv.unread_count ?? 0

        // Check if this is an OA / system bot conversation
        const isBot = conv.participants?.some(p => {
          const pid = (p as any).profile_id || p.user_id
          return isSystemProfile(pid)
        })

        return (
          <div
            key={conv.id}
            className="flex items-center gap-2 py-2 px-2.5 rounded-lg cursor-pointer hover:bg-gray-200/50 dark:hover:bg-white/[0.05] transition-colors mb-0.5"
            onClick={onSelectThread}
          >
            {isBot ? (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: BRAND_CTA }}
              >
                <Robot size={14} className="text-white" weight="bold" />
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: BRAND_CTA }}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.73rem] font-medium text-gray-900 dark:text-gray-100">
                  {name}
                </span>
                {isBot && (
                  <span className="text-[0.55rem] font-bold uppercase tracking-wider text-brand-cta bg-brand-cta/10 px-1 py-px rounded">
                    Bot
                  </span>
                )}
              </div>
              <div className="text-[0.65rem] text-gray-400 dark:text-gray-500 truncate">
                {snippet}
              </div>
            </div>
            {count > 0 && (
              <div className="w-4 h-4 rounded-full bg-brand-cta text-white text-[0.6rem] font-bold flex items-center justify-center flex-shrink-0">
                {count}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
