'use client'

import { Menu } from '@/components/ui/icons'
import Link from 'next/link'

interface AppHeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onBurgerClick: () => void
  burgerOpen: boolean
}

export function AppHeader({
  activeTab,
  onTabChange,
  onBurgerClick,
  burgerOpen
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-neutral-950 border-b border-neutral-800 sticky top-0 z-20">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src="/new_logos_opsly/opsly-mark.svg"
          alt="Opsly"
          className="h-11 w-auto"
        />
      </Link>
      
      {/* Burger Menu Button */}
      <button
        onClick={onBurgerClick}
        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  )
}