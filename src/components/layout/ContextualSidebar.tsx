'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Building2,
  MapPin,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Copy,
  Trash2,
  CheckSquare,
  Wrench,
  BarChart3,
  TrendingUp,
  Settings
} from 'lucide-react'

interface ContextualSidebarProps {
  isMinimized: boolean
  onToggleMinimize: () => void
  currentPage: string
}

// Contextual navigation items based on current page
const getContextualItems = (currentPage: string) => {
  switch (currentPage) {
    case 'organization':
      return [
        { id: 'business-details', label: 'Business Details', icon: Building2, path: '/dashboard/organization/business-details' },
        { id: 'sites', label: 'Sites', icon: MapPin, path: '/dashboard/organization/sites' },
        { id: 'users', label: 'Users', icon: Users, path: '/dashboard/organization/users' },
        { id: 'contractors', label: 'Contractors', icon: Users, path: '/dashboard/organization/contractors' },
        { id: 'policies', label: 'Documents', icon: FileText, path: '/dashboard/organization/documents' }
      ]
    case 'sops':
      return [
        { id: 'my-sops', label: 'My SOPs', icon: Edit3, path: '/dashboard/sops/list' },
        { id: 'templates', label: 'SOP Templates', icon: Copy, path: '/dashboard/sops/templates' },
        { id: 'risk-assessments', label: 'Risk Assessments', icon: FileText, path: '/dashboard/sops/risk-assessments' },
        { id: 'ra-templates', label: 'RA Templates', icon: Copy, path: '/dashboard/risk-assessments' },
        { id: 'coshh-data', label: 'COSHH Data', icon: Trash2, path: '/dashboard/coshh-data' },
        { id: 'libraries', label: 'SOP Libraries', icon: FileText, path: '/dashboard/sops/libraries' }
      ]
    case 'tasks':
      return [
        { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, path: '/dashboard/tasks' },
        { id: 'scheduled', label: 'Scheduled Tasks', icon: CheckSquare, path: '/dashboard/tasks/scheduled' },
        { id: 'completed', label: 'Completed Tasks', icon: CheckSquare, path: '/dashboard/tasks/completed' },
        { id: 'templates', label: 'Task Templates', icon: Copy, path: '/dashboard/tasks/templates' },
        { id: 'compliance', label: 'Compliance Templates', icon: CheckSquare, path: '/dashboard/compliance-templates' },
        { id: 'settings', label: 'Task Settings', icon: Settings, path: '/dashboard/tasks/settings' }
      ]
    case 'assets':
      return [
        { id: 'assets', label: 'Assets', icon: FileText, path: '/dashboard/assets' },
        { id: 'ppm-calendar', label: 'PPM Calendar', icon: Wrench, path: '/dashboard/ppm' },
        { id: 'callouts', label: 'Callout Logs', icon: FileText, path: '/dashboard/organization' },
        { id: 'archived', label: 'Archived Assets', icon: FileText, path: '/dashboard/archived-assets' }
      ]
    case 'checklists':
      return [
        { id: 'daily', label: 'Daily Checklists', icon: CheckSquare, path: '/dashboard/checklists' },
        { id: 'templates', label: 'Checklist Templates', icon: Copy, path: '/dashboard/checklists/templates' }
      ]
    case 'eho-readiness':
      return [
        { id: 'site-cards', label: 'Site Report Cards', icon: BarChart3, path: '/dashboard/eho-report' },
        { id: 'outstanding', label: 'Outstanding Tasks', icon: CheckSquare, path: '/dashboard/tasks/scheduled' },
        { id: 'issues', label: 'Issues', icon: Trash2, path: '/dashboard/incidents' }
      ]
    case 'reports':
      return [
        { id: 'compliance', label: 'Compliance Reports', icon: TrendingUp, path: '/dashboard/reports' },
        { id: 'incidents', label: 'Incident Reports', icon: Trash2, path: '/dashboard/incidents' }
      ]
    case 'settings':
      return [
        { id: 'profile', label: 'Profile', icon: Users, path: '/dashboard/settings' },
        { id: 'password', label: 'Password', icon: Settings, path: '/dashboard/settings' },
        { id: 'billing', label: 'Billing', icon: FileText, path: '/dashboard/settings' }
      ]
    default:
      return []
  }
}

export function ContextualSidebar({ isMinimized, onToggleMinimize, currentPage }: ContextualSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const contextualItems = getContextualItems(currentPage)

  const handleItemClick = (path: string) => {
    router.push(path)
  }

  const getActiveItem = () => {
    // Find the most specific match
    const sortedItems = contextualItems.sort((a, b) => b.path.length - a.path.length)
    return sortedItems.find(item => pathname.startsWith(item.path))?.id || 'home'
  }

  const activeItem = getActiveItem()

  return (
    <aside 
      className={`sticky top-0 h-screen flex flex-col border-r transition-all duration-300 ${
        isMinimized ? 'w-12' : 'w-40'
      }`}
      style={{
        backgroundColor: '#1A1A20',
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

      {/* Contextual Navigation Items */}
      <nav className="flex-1 py-2">
        {contextualItems.map((item) => {
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
                backgroundColor: isActive ? '#141419' : 'transparent',
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

      <style>{`
        .hovering {
          background: #141419 !important;
          color: white !important;
        }
      `}</style>
    </aside>
  )
}
