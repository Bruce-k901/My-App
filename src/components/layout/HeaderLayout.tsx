'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AppHeader } from './AppHeader'
import { MainSidebar } from './MainSidebar'
import { ContextualSidebar } from './ContextualSidebar'
import { BurgerMenu } from './BurgerMenu'

interface HeaderLayoutProps {
  children: React.ReactNode
  userRole?: 'admin' | 'manager' | 'team'
}

export function HeaderLayout({
  children,
  userRole = 'admin'
}: HeaderLayoutProps) {
  const [mainSidebarMinimized, setMainSidebarMinimized] = useState(false)
  const [contextSidebarMinimized, setContextSidebarMinimized] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const pathname = usePathname()

  // Determine current page for contextual sidebar
  const getCurrentPage = () => {
    // Check for specific routes first (most specific)
    if (pathname === '/organization/contractors') return 'contractors'
    if (pathname.includes('/organization/') || pathname === '/organization') return 'organization'
    if (pathname.includes('/sops')) return 'sops'
    if (pathname.includes('/tasks') || pathname.includes('/templates') || pathname.includes('/compliance-templates') || pathname.includes('/library')) return 'tasks'
    if (pathname.includes('/assets') || pathname.includes('/ppm')) return 'assets'
    if (pathname.includes('/eho-report')) return 'eho-readiness'
    if (pathname.includes('/reports')) return 'reports'
    if (pathname.includes('/settings')) return 'settings'
    return 'dashboard'
  }

  const currentPage = getCurrentPage()

  // Check if current page should show contextual sidebar
  const shouldShowContextSidebar = () => {
    const pagesWithContext = ['organization', 'sops', 'tasks', 'assets', 'eho-readiness', 'reports', 'settings']
    return pagesWithContext.includes(currentPage)
  }

  const handleMainSidebarToggle = () => {
    setMainSidebarMinimized(!mainSidebarMinimized)
  }

  const handleContextSidebarToggle = () => {
    setContextSidebarMinimized(!contextSidebarMinimized)
  }

  const handleBurgerClick = () => {
    setBurgerOpen(!burgerOpen)
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-900 text-white">
      <AppHeader
        activeTab="edit-tasks" // This will be determined by the main sidebar now
        onTabChange={() => {}} // No longer needed
        onBurgerClick={handleBurgerClick}
        burgerOpen={burgerOpen}
      />
      
      <div className="flex flex-1">
        {/* Main Sidebar */}
        <MainSidebar
          isMinimized={mainSidebarMinimized}
          onToggleMinimize={handleMainSidebarToggle}
          currentPage={currentPage}
        />
        
        {/* Contextual Sidebar - Only show if there are contextual items */}
        {shouldShowContextSidebar() && (
          <ContextualSidebar
            isMinimized={contextSidebarMinimized}
            onToggleMinimize={handleContextSidebarToggle}
            currentPage={currentPage}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      
      <BurgerMenu
        isOpen={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        userRole={userRole}
      />
    </div>
  )
}