'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, LayoutGrid, Building2, FileText, ClipboardList, Box, ShieldCheck, BarChart3, Settings, User, Lock, CreditCard, LogOut, Users, MapPin, Clock, Plug, AlertTriangle, UtensilsCrossed, MessageSquare, FileCheck, Calendar, CheckCircle, LayoutTemplate, BadgeCheck } from 'lucide-react'
import { useAppContext } from '@/context/AppContext'
import { getMenuItemsByRole, COLORS } from './navigation'

interface BurgerMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'admin' | 'manager' | 'team'
}

// Icon mapping for menu items
const iconMap: Record<string, any> = {
  dashboard: LayoutGrid,
  organization: Building2,
  sops: FileText,
  tasks: ClipboardList,
  assets: Box,
  'eho-readiness': ShieldCheck,
  reports: BarChart3,
  settings: Settings,
  profile: User,
  password: Lock,
  billing: CreditCard,
  signout: LogOut,
  'my-tasks': ClipboardList,
  templates: LayoutTemplate,
  compliance: ShieldCheck,
  'todays-checks': Calendar,
  'compliance-reports': BarChart3,
  incidents: AlertTriangle,
  'food-poisoning': UtensilsCrossed,
  contractor: Users,
  sites: MapPin,
  users: Users,
  'business-hours': Clock,
  integrations: Plug,
}

export function BurgerMenu({
  isOpen,
  onClose,
  userRole
}: BurgerMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useAppContext()
  const menuSections = getMenuItemsByRole(userRole)

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleNavigation = (path: string) => {
    if (path === '/') {
      router.push('/')
    } else {
      router.push(path)
    }
    onClose()
  }

  const handleSignOut = async () => {
    // Handle sign out logic here if needed
    router.push('/')
    onClose()
  }

  if (!isOpen) return null

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[320px] max-w-[90vw] z-50 shadow-2xl flex flex-col"
        style={{
          backgroundColor: '#09090B',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs text-white/60 capitalize">
                {userRole}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 min-h-0">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.id} className={sectionIndex > 0 ? 'mt-6' : ''}>
              {/* Section Header */}
              <div className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                {section.label}
              </div>

              {/* Section Items */}
              <div className="mt-1">
                {section.items.map((item) => {
                  const Icon = iconMap[item.id] || FileText
                  const active = isActive(item.path)
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.id === 'signout' ? handleSignOut() : handleNavigation(item.path)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all duration-150 text-left ${
                        active
                          ? 'bg-pink-500/20 text-pink-300 border-r-2 border-pink-500'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-pink-400' : 'text-white/50'}`} />
                      <span className="font-medium truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <div className="text-xs text-white/40 text-center">
            Checkly © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  )
}
