'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  Wrench,
  BarChart3,
  TrendingUp,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface MainSidebarProps {
  isMinimized: boolean
  onToggleMinimize: () => void
  currentPage: string
}

// Main navigation items - correct order per SIDEBAR_CORRECT_STRUCTURE.md
const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, isDivider: false },
  { id: 'divider', label: '', path: '', icon: null, isDivider: true },
  { id: 'organization', label: 'Organization', path: '/dashboard/organization', icon: Users, isDivider: false },
  { id: 'sops', label: 'SOPs', path: '/dashboard/sops', icon: FileText, isDivider: false },
  { id: 'tasks', label: 'Tasks', path: '/dashboard/tasks', icon: CheckSquare, isDivider: false },
  { id: 'assets', label: 'Assets', path: '/dashboard/assets', icon: Wrench, isDivider: false },
  { id: 'eho-readiness', label: 'EHO Readiness', path: '/dashboard/eho-report', icon: BarChart3, isDivider: false },
  { id: 'reports', label: 'Reports', path: '/dashboard/reports', icon: TrendingUp, isDivider: false },
  { id: 'settings', label: 'Settings', path: '/dashboard/settings', icon: Settings, isDivider: false },
  { id: 'help', label: 'Help & Support', path: '/dashboard/help', icon: HelpCircle, isDivider: false }
]

export function MainSidebar({ isMinimized, onToggleMinimize, currentPage }: MainSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleItemClick = (path: string) => {
    router.push(path)
  }

  const getActiveItem = () => {
    // Use currentPage from HeaderLayout instead of pathname matching
    return currentPage
  }

  const activeItem = getActiveItem()

  return (
    <aside 
      className={`sticky top-0 h-screen flex flex-col border-r transition-all duration-300 ${
        isMinimized ? 'w-12' : 'w-40'
      }`}
      style={{
        backgroundColor: '#141419',
        borderRightColor: '#2A2A2F'
      }}
    >
      {/* Minimize Toggle */}
      <div className="flex justify-end p-2 border-b" style={{ borderBottomColor: '#2A2A2F' }}>
        <button
          onClick={onToggleMinimize}
          className="p-1 rounded-md hover:bg-neutral-800 transition-colors"
          title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {isMinimized ? (
            <ChevronRight className="w-3 h-3 text-neutral-400" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-neutral-400" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-2">
        {MAIN_NAV_ITEMS.map((item) => {
          // Handle divider
          if (item.isDivider) {
            return (
              <div
                key={item.id}
                className="mx-3 my-2 border-t border-gray-600/30"
                style={{ borderColor: '#2A2A2F' }}
              />
            )
          }

          const Icon = item.icon
          const isActive = activeItem === item.id
          const isHovering = hoveredItem === item.id
          
          return (
            <button
              key={item.id}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleItemClick(item.path)}
              className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer transition-all duration-200 border-l-2 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              } ${isHovering ? 'hovering' : ''}`}
              style={{
                backgroundColor: isActive ? '#1A1A20' : 'transparent',
                borderLeftColor: isActive ? '#FF006E' : 'transparent',
                boxShadow: isHovering ? 'inset 0 0 8px rgba(255, 0, 110, 0.1)' : 'none',
                paddingLeft: isActive ? '10px' : '12px'
              }}
              title={isMinimized ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#FF006E' : '#FF006E' }} />
              {!isMinimized && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      <style jsx>{`
        .hovering {
          background: #1A1A20 !important;
          color: white !important;
        }
      `}</style>
    </aside>
  )
}
