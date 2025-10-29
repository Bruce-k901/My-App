'use client'

import { Menu } from 'lucide-react'
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
    <header className="flex items-center justify-center h-16 px-6 bg-neutral-950 border-b border-neutral-800 sticky top-0 z-20">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src="/assets/logo.png"
          alt="Checkly"
          className="h-11 w-auto"
        />
      </Link>
    </header>
  )
}