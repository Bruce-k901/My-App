'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { 
  ClipboardList, 
  FileText, 
  Shield, 
  CheckCircle, 
  Clock
} from 'lucide-react'
import { ActiveTab, SIDEBAR_MENUS, COLORS } from './navigation'

interface LeftSidebarProps {
  activeTab: ActiveTab
  activeMenuItem: string
  onMenuItemClick: (item: string) => void
  counts?: {
    stillToDo?: number
    done?: number
  }
}

const ICON_MAP = {
  'my-tasks': ClipboardList,
  'templates': FileText,
  'compliance': Shield,
  'still-to-do': Clock,
  'done': CheckCircle,
  'add': Clock  // Using Clock as fallback since Plus is removed
}

export function LeftSidebar({
  activeTab,
  activeMenuItem,
  onMenuItemClick,
  counts = {}
}: LeftSidebarProps) {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  
  // Get menu items based on active tab
  const menuItems = activeTab === 'edit-tasks' 
    ? SIDEBAR_MENUS.editTasks 
    : SIDEBAR_MENUS.todayChecks

  // Auto-select first item when tab changes
  useEffect(() => {
    if (menuItems.length > 0) {
      onMenuItemClick(menuItems[0].id)
    }
  }, [activeTab])

  const handleMouseEnter = (itemId: string) => {
    setHoveredItem(itemId)
    setIsLoadingPreview(true)
    
    // Simulate loading - in real app, this would fetch page content
    setTimeout(() => {
      setIsLoadingPreview(false)
    }, 400)
  }

  const handleMouseLeave = () => {
    setHoveredItem(null)
    setIsLoadingPreview(false)
  }

  const handleClick = (itemId: string) => {
    setHoveredItem(null)
    onMenuItemClick(itemId)
  }

  return (
    <aside 
      className={`sticky top-[60px] h-[calc(100vh-60px)] w-48 flex flex-col py-4 border-r transition-all duration-200 ${
        isLoadingPreview ? 'opacity-95' : ''
      }`}
      style={{
        backgroundColor: COLORS.background.light,
        borderRightColor: COLORS.border
      }}
    >
      {/* Menu Items */}
      <div className="flex-1">
        {menuItems.map((item) => {
          const Icon = ICON_MAP[item.id as keyof typeof ICON_MAP]
          const isActive = activeMenuItem === item.id
          const isHovering = hoveredItem === item.id
          
          return (
            <button
              key={item.id}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-normal cursor-pointer transition-all duration-200 border-l-2 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              } ${isHovering ? 'hovering' : ''}`}
              style={{
                backgroundColor: isActive ? COLORS.background.hover : 'transparent',
                borderLeftColor: isActive ? COLORS.accent : 'transparent',
                boxShadow: isHovering ? 'inset 0 0 8px rgba(255, 0, 110, 0.1)' : 'none'
              }}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="flex-1 text-left">
                {item.label}
                {item.id === 'still-to-do' && counts.stillToDo !== undefined && (
                  <span className="ml-2 text-xs" style={{ color: COLORS.text.tertiary }}>
                    ({counts.stillToDo})
                  </span>
                )}
                {item.id === 'done' && counts.done !== undefined && (
                  <span className="ml-2 text-xs" style={{ color: COLORS.text.tertiary }}>
                    ({counts.done})
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Loading indicator on hover */}
      {isLoadingPreview && (
        <div className="preview-loading">
          <div className="spinner" />
        </div>
      )}

      <style jsx>{`
        .preview-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 10;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 0, 110, 0.2);
          border-top: 2px solid #FF006E;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .hovering {
          background: ${COLORS.background.hover} !important;
          color: white !important;
        }

        @media (max-width: 768px) {
          .preview-loading {
            display: none;
          }
        }
      `}</style>
    </aside>
  )
}
